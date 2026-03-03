use anchor_lang::prelude::*;

use crate::errors::AjoError;
use crate::state::{GroupState, GroupStatus, MemberState, Proposal};

#[derive(Accounts)]
pub struct ProposeExtension<'info> {
    #[account(mut)]
    pub proposer: Signer<'info>,

    #[account(
        mut,
        constraint = group_state.status == GroupStatus::Active @ AjoError::GroupNotActive,
        constraint = group_state.active_proposal.is_none() @ AjoError::ActiveProposalExists,
    )]
    pub group_state: Account<'info, GroupState>,

    #[account(
        mut,
        constraint = member_state.wallet == proposer.key() @ AjoError::NotAMember,
        constraint = member_state.group == group_state.key() @ AjoError::NotAMember,
    )]
    pub member_state: Account<'info, MemberState>,
}

pub fn propose_extension_handler(ctx: Context<ProposeExtension>, extension_hours: u16) -> Result<()> {
    let group = &mut ctx.accounts.group_state;
    let member_state = &mut ctx.accounts.member_state;

    // Limit extension between 1 hour and 14 days (336 hours)
    require!(extension_hours > 0 && extension_hours <= 336, AjoError::InvalidExtension);

    let now = Clock::get()?.unix_timestamp;
    
    // Proposal expires in 24 hours or at round end, whichever is sooner
    let expires_at = now.checked_add(24 * 60 * 60).ok_or(AjoError::ArithmeticOverflow)?;

    group.active_proposal = Some(Proposal {
        target_round: group.current_round,
        extension_hours,
        consensus_reached: false,
        expires_at,
        yes_votes: 1, // Proposer votes yes
    });

    // Mark proposer as having voted on this proposal session
    member_state.last_voted_proposal = expires_at;

    msg!(
        "Proposal to extend round {} by {} hours submitted by {}. Expiration: {}",
        group.current_round,
        extension_hours,
        ctx.accounts.proposer.key(),
        expires_at
    );

    Ok(())
}
