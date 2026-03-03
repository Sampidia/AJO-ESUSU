use anchor_lang::prelude::*;

/// Per-member state within a group.
#[account]
#[derive(InitSpace)]
pub struct MemberState {
    /// The member's wallet address.
    pub wallet: Pubkey,

    /// The group this member belongs to.
    pub group: Pubkey,

    /// Remaining collateral balance in lamports.
    /// Starts at payout_amount, decreases with each auto-pull.
    pub collateral_balance: u64,

    /// Position in rotation order (0-indexed).
    pub rotation_position: u8,

    /// Unix timestamp of when the member joined.
    pub joined_at: i64,

    /// Whether collateral has been refunded at cycle end.
    pub refunded: bool,

    /// PDA bump seed.
    pub bump: u8,

    /// Governance: The expires_at timestamp of the last proposal voted on.
    pub last_voted_proposal: i64,
}
