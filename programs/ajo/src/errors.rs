use anchor_lang::prelude::*;

/// Custom error codes for the Ajo program.
#[error_code]
pub enum AjoError {
    #[msg("Group name must be between 1 and 32 characters")]
    InvalidGroupName,

    #[msg("Member count must be between 2 and 20")]
    InvalidMemberCount,

    #[msg("Payout amount does not meet the minimum requirement")]
    MinPayoutNotMet,

    #[msg("Payout amount must be perfectly divisible by member count")]
    PayoutNotDivisible,

    #[msg("Invalid payout amount")]
    InvalidPayoutAmount,

    #[msg("Round interval must be between 0 (Daily) and 3 (Yearly)")]
    InvalidRoundInterval,

    #[msg("Group is already full")]
    GroupFull,

    #[msg("Group is not in Filling status")]
    GroupNotFilling,

    #[msg("Group is not in Active status")]
    GroupNotActive,

    #[msg("Group is not full yet")]
    GroupNotFull,

    #[msg("Cycle has not completed")]
    CycleNotCompleted,

    #[msg("Member has already joined this group")]
    AlreadyJoined,

    #[msg("Insufficient lamports for collateral deposit")]
    InsufficientCollateral,

    #[msg("Invalid contribution amount")]
    InvalidContributionAmount,

    #[msg("Member has already contributed this round")]
    AlreadyContributed,

    #[msg("Grace period has not expired yet")]
    GracePeriodNotExpired,

    #[msg("Not all contributions have been settled")]
    ContributionsMissing,

    #[msg("Payout has already been sent for this round")]
    PayoutAlreadySent,

    #[msg("Member is not part of this group")]
    NotAMember,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,

    #[msg("Collateral already refunded for this member")]
    CollateralAlreadyRefunded,

    #[msg("Round does not match current group round")]
    RoundMismatch,

    #[msg("Member has not defaulted this round")]
    MemberNotDefaulted,

    #[msg("Cannot leave group after it has started")]
    CannotLeaveActiveGroup,

    #[msg("Only admin can delete the group")]
    NotAdmin,

    #[msg("Cannot delete group with active members. Members must leave first.")]
    GroupHasMembers,

    #[msg("Active proposal already exists for this round")]
    ActiveProposalExists,

    #[msg("No active proposal found")]
    NoActiveProposal,

    #[msg("Proposal has expired")]
    ProposalExpired,

    #[msg("Member has already voted on this proposal")]
    VotingAlreadySent,

    #[msg("Invalid extension days requested")]
    InvalidExtension,

    #[msg("Invalid token program provided")]
    InvalidTokenProgram,

    #[msg("Invalid token account provided")]
    InvalidTokenAccount,
}
