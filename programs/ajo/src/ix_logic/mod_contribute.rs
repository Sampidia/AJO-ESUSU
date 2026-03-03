use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::errors::AjoError;
use crate::state::{GroupState, GroupStatus, MemberState, RoundState};

#[derive(Accounts)]
pub struct Contribute<'info> {
    /// The member contributing.
    #[account(mut)]
    pub member: Signer<'info>,

    /// The group.
    #[account(
        constraint = group_state.status == GroupStatus::Active @ AjoError::GroupNotActive,
    )]
    pub group_state: Account<'info, GroupState>,

    /// The member's state.
    #[account(
        constraint = member_state.wallet == member.key() @ AjoError::NotAMember,
        constraint = member_state.group == group_state.key() @ AjoError::NotAMember,
    )]
    pub member_state: Account<'info, MemberState>,

    /// The current round state.
    #[account(
        mut,
        constraint = round_state.group == group_state.key() @ AjoError::RoundMismatch,
        constraint = round_state.round_number == group_state.current_round @ AjoError::RoundMismatch,
    )]
    pub round_state: Account<'info, RoundState>,

    /// The vault PDA that holds all funds.
    /// CHECK: PDA-controlled SOL holding account.
    #[account(
        mut,
        seeds = [b"vault", group_state.key().as_ref()],
        bump = group_state.vault_bump,
    )]
    pub vault: SystemAccount<'info>,

    /// Vault token account if using SPL.
    /// CHECK: Validated in handler if group has mint.
    #[account(mut)]
    pub vault_token_account: AccountInfo<'info>,

    /// Member's token account if using SPL.
    /// CHECK: Validated in handler if group has mint.
    #[account(mut)]
    pub member_token_account: AccountInfo<'info>,

    /// Mint for validation.
    /// CHECK: Validated in handler.
    pub mint: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

pub fn contribute_handler(ctx: Context<Contribute>) -> Result<()> {
    let member_state = &ctx.accounts.member_state;
    let round = &mut ctx.accounts.round_state;
    let group = &ctx.accounts.group_state;
    let position = member_state.rotation_position as usize;

    // Validate member hasn't already contributed this round
    require!(
        !round.contributions_received[position],
        AjoError::AlreadyContributed
    );

    // Transfer exact contribution amount from member to vault
    if let Some(mint_key) = group.mint {
        // Validate mint
        require!(ctx.accounts.mint.key() == mint_key, AjoError::InvalidTokenProgram);

        let token_program = &ctx.accounts.token_program;
        let from = &ctx.accounts.member_token_account;
        let to = &ctx.accounts.vault_token_account;

        token::transfer(
            CpiContext::new(
                token_program.to_account_info(),
                Transfer {
                    from: from.to_account_info(),
                    to: to.to_account_info(),
                    authority: ctx.accounts.member.to_account_info(),
                },
            ),
            group.contribution_amount,
        )?;
    } else {
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.member.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                },
            ),
            group.contribution_amount,
        )?;
    }

    // Mark contribution as received
    round.contributions_received[position] = true;

    msg!(
        "Contribution of {} lamports received from {} for group {} round {}",
        group.contribution_amount,
        ctx.accounts.member.key(),
        group.key(),
        round.round_number,
    );

    Ok(())
}
