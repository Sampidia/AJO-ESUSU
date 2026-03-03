use anchor_lang::prelude::*;

use crate::errors::AjoError;
use crate::state::{GroupState, GroupStatus, MemberState, RoundState};
use anchor_spl::token::{self, Token};

#[derive(Accounts)]
pub struct RefundCollateral<'info> {
    /// The caller (keeper server or anyone). Anyone can trigger refund after completion.
    #[account(mut)]
    pub caller: Signer<'info>,

    /// The group (must be completed or final round payout sent).
    #[account(
        constraint = group_state.status == GroupStatus::Completed || 
                     (group_state.status == GroupStatus::Active && 
                      group_state.current_round == group_state.member_count &&
                      final_round_state.payout_sent) @ AjoError::CycleNotCompleted,
    )]
    pub group_state: Account<'info, GroupState>,

    /// The final round state (used to verify completion if status is still Active).
    #[account(
        constraint = final_round_state.group == group_state.key() @ AjoError::RoundMismatch,
        constraint = final_round_state.round_number == group_state.member_count @ AjoError::RoundMismatch,
    )]
    pub final_round_state: Account<'info, RoundState>,

    /// The member state to refund.
    #[account(
        mut,
        constraint = member_state.group == group_state.key() @ AjoError::NotAMember,
        constraint = !member_state.refunded @ AjoError::CollateralAlreadyRefunded,
    )]
    pub member_state: Account<'info, MemberState>,

    /// The vault PDA (source of refund).
    /// CHECK: PDA-controlled SOL holding account.
    #[account(
        mut,
        seeds = [b"vault", group_state.key().as_ref()],
        bump = group_state.vault_bump,
    )]
    pub vault: SystemAccount<'info>,

    /// The member's wallet (receives refund).
    /// CHECK: Destination wallet for collateral refund.
    #[account(
        mut,
        constraint = member_wallet.key() == member_state.wallet @ AjoError::NotAMember,
    )]
    pub member_wallet: UncheckedAccount<'info>,

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

pub fn refund_collateral_handler(ctx: Context<RefundCollateral>) -> Result<()> {
    let member_state = &mut ctx.accounts.member_state;
    let refund_amount = member_state.collateral_balance;

    if refund_amount > 0 {
        // Transfer remaining collateral from vault to member wallet (CPI with seeds)
        let group_key = ctx.accounts.group_state.key();
        let vault_seeds: &[&[u8]] = &[
            b"vault",
            group_key.as_ref(),
            &[ctx.accounts.group_state.vault_bump],
        ];
        let signer_seeds = &[vault_seeds];

        if let Some(mint_key) = ctx.accounts.group_state.mint {
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
                    signer_seeds,
                ),
                refund_amount,
            )?;
        } else {
            anchor_lang::system_program::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(),
                    anchor_lang::system_program::Transfer {
                        from: ctx.accounts.vault.to_account_info(),
                        to: ctx.accounts.member_wallet.to_account_info(),
                    },
                    signer_seeds,
                ),
                refund_amount,
            )?;
        }

        msg!(
            "Refunded {} lamports collateral to member {}",
            refund_amount,
            member_state.wallet,
        );
    } else {
        msg!(
            "No collateral to refund for member {} (fully consumed by auto-pulls)",
            member_state.wallet,
        );
    }

    // Mark as refunded to prevent double refund
    member_state.refunded = true;
    member_state.collateral_balance = 0;

    Ok(())
}
