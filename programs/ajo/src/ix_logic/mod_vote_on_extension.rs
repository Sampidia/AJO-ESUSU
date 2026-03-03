use anchor_lang::prelude::*;

use crate::errors::AjoError;
use crate::state::{GroupState, GroupStatus, MemberState, RoundState};

#[derive(Accounts)]
pub struct VoteOnExtension<'info> {
    #[account(mut)]
    pub voter: Signer<'info>,

    #[account(
        mut,
        constraint = group_state.status == GroupStatus::Active @ AjoError::GroupNotActive,
        constraint = group_state.active_proposal.is_some() @ AjoError::NoActiveProposal,
    )]
    pub group_state: Account<'info, GroupState>,

    #[account(
        mut,
        constraint = round_state.group == group_state.key() @ AjoError::RoundMismatch,
        constraint = round_state.round_number == group_state.current_round @ AjoError::RoundMismatch,
    )]
    pub round_state: Account<'info, RoundState>,

    #[account(
        mut,
        constraint = member_state.wallet == voter.key() @ AjoError::NotAMember,
        constraint = member_state.group == group_state.key() @ AjoError::NotAMember,
    )]
    pub member_state: Account<'info, MemberState>,
}

pub fn vote_on_extension_handler(ctx: Context<VoteOnExtension>) -> Result<()> {
    let group = &mut ctx.accounts.group_state;
    let round = &mut ctx.accounts.round_state;
    let member_state = &mut ctx.accounts.member_state;
    let now = Clock::get()?.unix_timestamp;

    let mut proposal = group.active_proposal.ok_or(AjoError::NoActiveProposal)?;

    require!(now < proposal.expires_at, AjoError::ProposalExpired);
    require!(!proposal.consensus_reached, AjoError::ActiveProposalExists);
    
    // Prevent double voting: member must not have voted on this specific proposal (linked by expires_at)
    require!(member_state.last_voted_proposal != proposal.expires_at, AjoError::VotingAlreadySent);
    
    proposal.yes_votes += 1;
    member_state.last_voted_proposal = proposal.expires_at;

    // Consensus = majority (> 50%)
    if proposal.yes_votes > (group.member_count / 2) {
        proposal.consensus_reached = true;
        
        // Apply extension in hours
        let extension_seconds = (proposal.extension_hours as i64)
            .checked_mul(60 * 60)
            .ok_or(AjoError::ArithmeticOverflow)?;
            
        round.due_timestamp = round.due_timestamp
            .checked_add(extension_seconds)
            .ok_or(AjoError::ArithmeticOverflow)?;
            
        round.grace_end_timestamp = round.grace_end_timestamp
            .checked_add(extension_seconds)
            .ok_or(AjoError::ArithmeticOverflow)?;

        msg!(
            "Consensus reached! Group {} Round {} extended by {} hours.",
            group.key(),
            group.current_round,
            proposal.extension_hours
        );
    }

    group.active_proposal = Some(proposal);

    msg!(
        "Vote received from {}. Current yes_votes: {}/{}",
        ctx.accounts.voter.key(),
        proposal.yes_votes,
        group.member_count
    );

    Ok(())
}
