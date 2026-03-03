use anchor_lang::prelude::*;

/// State for a single round within a cycle.
#[account]
#[derive(InitSpace)]
pub struct RoundState {
    /// The group this round belongs to.
    pub group: Pubkey,

    /// Round number (1-indexed).
    pub round_number: u8,

    /// Unix timestamp when contributions are due.
    pub due_timestamp: i64,

    /// Unix timestamp when grace period ends (due + 24 hours).
    pub grace_end_timestamp: i64,

    /// Bitmap of contributions received, indexed by rotation position.
    /// true = member has paid (manually or via auto-pull).
    #[max_len(20)]
    pub contributions_received: Vec<bool>,

    /// Whether the payout has been sent for this round.
    pub payout_sent: bool,

    /// PDA bump seed.
    pub bump: u8,
}
