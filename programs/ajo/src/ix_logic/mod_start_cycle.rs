use anchor_lang::prelude::*;

use crate::errors::AjoError;
use crate::state::{GroupState, GroupStatus, RoundState};
use crate::ix_logic::mod_initialize_group::{WEEKLY_SECONDS, MONTHLY_SECONDS};

/// Grace period: 24 hours in production. Using 2 minutes for dev.
pub const GRACE_PERIOD_SECONDS: i64 = 2 * 60; // 2 minutes (dev); production: 86_400

#[derive(Accounts)]
pub struct StartCycle<'info> {
    /// The caller (keeper server or admin). Anyone can call this once the group is full.
    #[account(mut)]
    pub caller: Signer<'info>,

    /// The group to start.
    #[account(
        mut,
        constraint = group_state.status == GroupStatus::Filling @ AjoError::GroupNotFilling,
        constraint = group_state.members.len() as u8 == group_state.member_count @ AjoError::GroupNotFull,
    )]
    pub group_state: Account<'info, GroupState>,

    /// Round 1 state PDA.
    #[account(
        init,
        payer = caller,
        space = 8 + RoundState::INIT_SPACE,
        seeds = [b"round", group_state.key().as_ref(), &[1u8]],
        bump,
    )]
    pub round_state: Account<'info, RoundState>,

    pub system_program: Program<'info, System>,
}

pub fn start_cycle_handler(ctx: Context<StartCycle>) -> Result<()> {
    let group = &mut ctx.accounts.group_state;
    let now = Clock::get()?.unix_timestamp;

    use crate::ix_logic::mod_initialize_group::{DAILY_SECONDS, YEARLY_SECONDS};

    // Calculate round interval in seconds
    let interval = match group.round_interval {
        0 => DAILY_SECONDS,
        1 => WEEKLY_SECONDS,
        2 => MONTHLY_SECONDS,
        3 => YEARLY_SECONDS,
        _ => WEEKLY_SECONDS, // Fallback
    };

    // Set due timestamp for Round 1
    let due_timestamp = now
        .checked_add(interval)
        .ok_or(AjoError::ArithmeticOverflow)?;
    let grace_end_timestamp = due_timestamp
        .checked_add(GRACE_PERIOD_SECONDS)
        .ok_or(AjoError::ArithmeticOverflow)?;

    // Initialize Round 1 state
    let round = &mut ctx.accounts.round_state;
    round.group = group.key();
    round.round_number = 1;
    round.due_timestamp = due_timestamp;
    round.grace_end_timestamp = grace_end_timestamp;
    round.contributions_received = vec![true; group.member_count as usize];
    round.payout_sent = false;
    round.bump = ctx.bumps.round_state;

    // Activate the group
    group.status = GroupStatus::Active;
    group.current_round = 1;

    msg!(
        "Cycle started for group {}. Round 1 due at timestamp {}. Recipient: #1",
        group.key(),
        due_timestamp,
    );

    Ok(())
}
