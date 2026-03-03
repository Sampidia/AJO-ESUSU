use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::errors::AjoError;
use crate::state::{GroupState, GroupStatus, MemberState};
use crate::ix_logic::mod_initialize_group::{PLATFORM_FEE_SOL, PLATFORM_FEE_USDC};
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use anchor_spl::associated_token::AssociatedToken;

#[derive(Accounts)]
pub struct JoinGroup<'info> {
    /// The member joining the group.
    #[account(mut)]
    pub member: Signer<'info>,

    /// The group to join.
    #[account(
        mut,
        constraint = group_state.status == GroupStatus::Filling @ AjoError::GroupNotFilling,
        constraint = (group_state.members.len() as u8) < group_state.member_count @ AjoError::GroupFull,
    )]
    pub group_state: Account<'info, GroupState>,

    /// The member state PDA (created on join).
    #[account(
        init,
        payer = member,
        space = 8 + MemberState::INIT_SPACE,
        seeds = [b"member", group_state.key().as_ref(), member.key().as_ref()],
        bump,
    )]
    pub member_state: Account<'info, MemberState>,

    /// The vault PDA that holds collateral.
    /// CHECK: PDA-controlled SOL holding account.
    #[account(
        mut,
        seeds = [b"vault", group_state.key().as_ref()],
        bump = group_state.vault_bump,
    )]
    pub vault: SystemAccount<'info>,

    /// The platform fee recipient wallet.
    /// CHECK: Receives the flat platform join fee.
    #[account(mut)]
    pub platform_wallet: UncheckedAccount<'info>,

    /// Optional mint for SPL support.
    /// CHECK: Validated in handler if group has mint.
    pub mint: AccountInfo<'info>,

    /// Vault token account if using SPL.
    /// CHECK: Validated in handler if group has mint.
    #[account(mut)]
    pub vault_token_account: AccountInfo<'info>,

    /// Member token account if using SPL.
    /// CHECK: Validated in handler if group has mint.
    #[account(mut)]
    pub member_token_account: AccountInfo<'info>,

    /// Platform token account if using SPL.
    /// CHECK: Validated in handler if group has mint.
    #[account(mut)]
    pub platform_token_account: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn join_group_handler(ctx: Context<JoinGroup>) -> Result<()> {
    let group = &mut ctx.accounts.group_state;
    let member_wallet = ctx.accounts.member.key();

    // Ensure member hasn't already joined
    require!(
        !group.members.contains(&member_wallet),
        AjoError::AlreadyJoined
    );

    // Transfer collateral + first contribution from member to vault
    let total_deposit = group.collateral_amount
        .checked_add(group.contribution_amount)
        .ok_or(AjoError::ArithmeticOverflow)?;

    if let Some(mint_key) = group.mint {
        msg!("JoinGroup: Using SPL Token Flow (mint: {})", mint_key);
        // Validate mint
        require!(ctx.accounts.mint.key() == mint_key, AjoError::InvalidTokenProgram);

        let token_program = &ctx.accounts.token_program;
        let from = &ctx.accounts.member_token_account;
        let to_vault = &ctx.accounts.vault_token_account;
        let to_platform = &ctx.accounts.platform_token_account;

        // Payout to Vault
        msg!("JoinGroup: Transferring {} tokens to vault", total_deposit);
        token::transfer(
            CpiContext::new(
                token_program.to_account_info(),
                Transfer {
                    from: from.to_account_info(),
                    to: to_vault.to_account_info(),
                    authority: ctx.accounts.member.to_account_info(),
                },
            ),
            total_deposit,
        )?;

        // Initialize platform ATA if needed (payer is the joining member)
        if ctx.accounts.platform_token_account.data_is_empty() {
            msg!("JoinGroup: Creating platform ATA");
            anchor_spl::associated_token::create(
                CpiContext::new(
                    ctx.accounts.associated_token_program.to_account_info(),
                    anchor_spl::associated_token::Create {
                        payer: ctx.accounts.member.to_account_info(),
                        associated_token: ctx.accounts.platform_token_account.to_account_info(),
                        authority: ctx.accounts.platform_wallet.to_account_info(),
                        mint: ctx.accounts.mint.to_account_info(),
                        system_program: ctx.accounts.system_program.to_account_info(),
                        token_program: ctx.accounts.token_program.to_account_info(),
                    },
                ),
            )?;
        }

        // Platform Fee (USDC)
        msg!("JoinGroup: Transferring {} USDC platform fee", PLATFORM_FEE_USDC);
        token::transfer(
            CpiContext::new(
                token_program.to_account_info(),
                Transfer {
                    from: from.to_account_info(),
                    to: to_platform.to_account_info(),
                    authority: ctx.accounts.member.to_account_info(),
                },
            ),
            PLATFORM_FEE_USDC,
        )?;
    } else {
        msg!("JoinGroup: Using SOL Flow");
        // SOL Group - Transfer collateral + first contribution to vault
        msg!("JoinGroup: Transferring {} lamports to vault", total_deposit);
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.member.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                },
            ),
            total_deposit,
        )?;

        // Platform Fee (SOL)
        msg!("JoinGroup: Transferring {} lamports platform fee", PLATFORM_FEE_SOL);
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.member.to_account_info(),
                    to: ctx.accounts.platform_wallet.to_account_info(),
                },
            ),
            PLATFORM_FEE_SOL,
        )?;
    }

    // Determine rotation position (0-indexed, based on join order)
    let rotation_position = group.members.len() as u8;

    // Initialize member state
    let member_state = &mut ctx.accounts.member_state;
    member_state.wallet = member_wallet;
    member_state.group = group.key();
    member_state.collateral_balance = group.collateral_amount;
    member_state.rotation_position = rotation_position;
    member_state.joined_at = Clock::get()?.unix_timestamp;
    member_state.refunded = false;
    member_state.bump = ctx.bumps.member_state;
    member_state.last_voted_proposal = 0;

    // Add member to the group's rotation list
    group.members.push(member_wallet);

    msg!(
        "Member {} joined group {}. Position: #{}",
        member_wallet,
        group.key(),
        rotation_position + 1,
    );

    Ok(())
}
