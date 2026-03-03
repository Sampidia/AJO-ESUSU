use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::errors::AjoError;
use crate::state::{GroupState, GroupStatus, MemberState};
use anchor_spl::token::{self, Token};

#[derive(Accounts)]
pub struct LeaveGroup<'info> {
    /// The member leaving the group.
    #[account(mut)]
    pub member: Signer<'info>,

    /// The group to leave.
    #[account(
        mut,
        constraint = group_state.status == GroupStatus::Filling @ AjoError::GroupNotFilling,
    )]
    pub group_state: Account<'info, GroupState>,

    /// The member's state PDA. Will be closed.
    #[account(
        mut,
        close = member,
        seeds = [b"member", group_state.key().as_ref(), member.key().as_ref()],
        bump = member_state.bump,
    )]
    pub member_state: Account<'info, MemberState>,

    /// The vault PDA to refund from.
    /// CHECK: PDA-controlled account.
    #[account(
        mut,
        seeds = [b"vault", group_state.key().as_ref()],
        bump = group_state.vault_bump,
    )]
    pub vault: SystemAccount<'info>,

    /// Optional mint for stablecoin support.
    /// CHECK: Validated in handler if group has mint.
    pub mint: AccountInfo<'info>,

    /// Vault token account if using SPL.
    /// CHECK: Validated in handler if group has mint.
    #[account(mut)]
    pub vault_token_account: AccountInfo<'info>,

    /// Member's token account if using SPL.
    /// CHECK: Validated in handler if group has mint.
    #[account(mut)]
    pub member_token_account: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

pub fn leave_group_handler(ctx: Context<LeaveGroup>) -> Result<()> {
    let group = &mut ctx.accounts.group_state;
    let member_wallet = ctx.accounts.member.key();
    let collateral_amount = ctx.accounts.member_state.collateral_balance;
    let contribution_amount = group.contribution_amount;

    let total_refund = collateral_amount
        .checked_add(contribution_amount)
        .ok_or(AjoError::ArithmeticOverflow)?;

    // Ensure member is in the list
    let index = group.members.iter().position(|&m| m == member_wallet)
        .ok_or(AjoError::NotAMember)?;

    // Remove member from group list
    group.members.remove(index);

    // Refund from vault to member
    let group_pubkey = group.key();
    let seeds = &[
        b"vault",
        group_pubkey.as_ref(),
        &[group.vault_bump],
    ];
    let signer = &[&seeds[..]];

    if let Some(mint_key) = group.mint {
        // Validate mint
        require!(ctx.accounts.mint.key() == mint_key, AjoError::InvalidTokenProgram);

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.vault_token_account.to_account_info(),
                    to: ctx.accounts.member_token_account.to_account_info(),
                    authority: ctx.accounts.vault.to_account_info(),
                },
                signer,
            ),
            total_refund,
        )?;
    } else {
        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.member.to_account_info(),
                },
                signer,
            ),
            total_refund,
        )?;
    }

    msg!(
        "Member {} left group '{}'. Refunded {} lamports.",
        member_wallet,
        group.name,
        total_refund
    );

    Ok(())
}
