use anchor_lang::prelude::*;

pub mod errors;
pub mod ix_logic;
pub mod state;

use ix_logic::*;

declare_id!("CR6pmRS8pcrc2grm2Hiq8Ny9fhvRV7mx6dYN5Bbs829X");

#[program]
pub mod ajo {
    use super::*;

    pub fn initialize_group(
        ctx: Context<InitializeGroup>,
        name: String,
        member_count: u8,
        payout_amount: u64,
        round_interval: u8,
        mint: Option<Pubkey>,
    ) -> Result<()> {
        ix_logic::mod_initialize_group::initialize_group_handler(ctx, name, member_count, payout_amount, round_interval, mint)
    }

    /// Joins an existing group by depositing collateral.
    /// The member's rotation position is based on join order.
    pub fn join_group(ctx: Context<JoinGroup>) -> Result<()> {
        ix_logic::mod_join_group::join_group_handler(ctx)
    }

    /// Starts the cycle once all member slots are filled.
    /// Creates Round 1 with the appropriate deadline.
    pub fn start_cycle(ctx: Context<StartCycle>) -> Result<()> {
        ix_logic::mod_start_cycle::start_cycle_handler(ctx)
    }

    /// Member contributes their share for the current round.
    /// Transfers exactly contribution_amount to the vault.
    pub fn contribute(ctx: Context<Contribute>) -> Result<()> {
        ix_logic::mod_contribute::contribute_handler(ctx)
    }

    /// After grace period, pulls contribution from a defaulter's collateral.
    /// Anyone can call this for any unpaid member once the grace period expires.
    pub fn auto_pull(ctx: Context<AutoPull>, member_index: u8) -> Result<()> {
        ix_logic::mod_auto_pull::auto_pull_handler(ctx, member_index)
    }

    /// Executes payout to the round recipient once all contributions are settled.
    /// Deducts 0.5% platform fee and advances to the next round.
    pub fn payout_round(ctx: Context<PayoutRound>) -> Result<()> {
        ix_logic::mod_payout::payout_handler(ctx)
    }

    /// Refunds remaining collateral to a member after the cycle is complete.
    pub fn refund_collateral(ctx: Context<RefundCollateral>) -> Result<()> {
        ix_logic::mod_refund_collateral::refund_collateral_handler(ctx)
    }

    /// Leaves a group before it starts. Returns collateral.
    pub fn leave_group(ctx: Context<LeaveGroup>) -> Result<()> {
        ix_logic::mod_leave_group::leave_group_handler(ctx)
    }

    /// Deletes a group (Admin only, before any other members join).
    pub fn delete_group(ctx: Context<DeleteGroup>) -> Result<()> {
        ix_logic::mod_delete_group::delete_group_handler(ctx)
    }

    pub fn propose_extension(ctx: Context<ProposeExtension>, extension_hours: u16) -> Result<()> {
        ix_logic::mod_propose_extension::propose_extension_handler(ctx, extension_hours)
    }

    pub fn vote_on_extension(ctx: Context<VoteOnExtension>) -> Result<()> {
        ix_logic::mod_vote_on_extension::vote_on_extension_handler(ctx)
    }
}
