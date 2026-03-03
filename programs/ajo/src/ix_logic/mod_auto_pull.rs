use anchor_lang::prelude::*;

use crate::errors::AjoError;
use crate::state::{GroupState, GroupStatus, MemberState, RoundState};

#[derive(Accounts)]
#[instruction(member_index: u8)]
pub struct AutoPull<'info> {
    /// The caller (keeper server). Anyone can call after grace period.
    pub caller: Signer<'info>,

    /// The group.
    #[account(
        constraint = group_state.status == GroupStatus::Active @ AjoError::GroupNotActive,
    )]
    pub group_state: Account<'info, GroupState>,

    /// The defaulting member's state.
    #[account(
        mut,
        constraint = member_state.group == group_state.key() @ AjoError::NotAMember,
        constraint = member_state.rotation_position == member_index @ AjoError::NotAMember,
    )]
    pub member_state: Account<'info, MemberState>,

    /// The current round state.
    #[account(
        mut,
        constraint = round_state.group == group_state.key() @ AjoError::RoundMismatch,
        constraint = round_state.round_number == group_state.current_round @ AjoError::RoundMismatch,
    )]
    pub round_state: Account<'info, RoundState>,
}

pub fn auto_pull_handler(ctx: Context<AutoPull>, member_index: u8) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let round = &mut ctx.accounts.round_state;
    let member_state = &mut ctx.accounts.member_state;
    let group = &ctx.accounts.group_state;
    let position = member_index as usize;

    // Grace period must have expired
    require!(
        now >= round.grace_end_timestamp,
        AjoError::GracePeriodNotExpired
    );

    // Member must not have already paid
    require!(
        !round.contributions_received[position],
        AjoError::MemberNotDefaulted
    );

    // Deduct contribution from member's collateral
    // No actual SOL transfer needed — collateral is already in the vault.
    // We just reduce the member's tracked collateral balance.
    let contribution = group.contribution_amount;
    member_state.collateral_balance = member_state
        .collateral_balance
        .checked_sub(contribution)
        .ok_or(AjoError::ArithmeticOverflow)?;

    // Mark as contributed (via auto-pull)
    round.contributions_received[position] = true;

    msg!(
        "Auto-pull: {} lamports deducted from member #{}'s collateral. Remaining: {} lamports",
        contribution,
        member_index + 1,
        member_state.collateral_balance,
    );

    Ok(())
}
