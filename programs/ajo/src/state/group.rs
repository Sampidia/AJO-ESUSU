use anchor_lang::prelude::*;

/// The state of a savings group.
#[account]
#[derive(InitSpace)]
pub struct GroupState {
    /// The admin who created this group.
    pub admin: Pubkey,

    /// Group name (max 32 characters).
    #[max_len(32)]
    pub name: String,

    /// Maximum number of members (2–20). Also equals total rounds.
    pub member_count: u8,

    /// Payout amount in lamports, set by admin.
    pub payout_amount: u64,

    /// Contribution per member per round (payout / member_count), in lamports.
    pub contribution_amount: u64,

    /// Collateral amount per member (= payout_amount), in lamports.
    pub collateral_amount: u64,

    /// Round interval: 0 = weekly (7 days), 1 = monthly (30 days).
    pub round_interval: u8,

    /// Current round number (1-indexed, 0 = not started).
    pub current_round: u8,

    /// Ordered list of member pubkeys (join order = rotation order).
    #[max_len(20)]
    pub members: Vec<Pubkey>,

    /// Current lifecycle status of the group.
    pub status: GroupStatus,

    /// PDA bump seed.
    pub bump: u8,

    /// Vault PDA bump seed.
    pub vault_bump: u8,

    /// Optional mint for SPL tokens (USDC/USDT). If None, uses SOL.
    pub mint: Option<Pubkey>,

    /// Governance: Active proposal for deadline extension (round_number, expires_at, votes).
    pub active_proposal: Option<Proposal>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, InitSpace)]
pub struct Proposal {
    pub target_round: u8,
    pub extension_hours: u16,
    pub consensus_reached: bool,
    pub expires_at: i64,
    pub yes_votes: u8,
}

/// Lifecycle status of a group.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum GroupStatus {
    /// Group created, members can join.
    Filling,
    /// All slots filled, cycle is running.
    Active,
    /// All rounds complete, collateral refunded.
    Completed,
}
