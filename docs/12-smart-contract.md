# 12 — Smart Contract Design (Anchor / Rust)

[← Back to README](../README.md) | [← Architecture](11-architecture.md)

---

## 12.1 Program Accounts

| Account | Type | Data Stored |
|---------|------|------------|
| `GroupState` | PDA | Group name, member count, payout amount, contribution amount, collateral amount, round interval, current round, rotation list, status |
| `MemberState` | PDA per member | Wallet address, collateral balance, contributions paid per round, join timestamp, rotation position |
| `Vault` | PDA (holds SOL) | All collateral + contribution funds in escrow. Released only by program instructions. |
| `RoundState` | PDA per round | Round number, due timestamp, grace period end, contributions received bitmap, payout sent flag |

---

## 12.2 Instructions

| Instruction | Caller | Action |
|------------|--------|--------|
| `initialize_group` | Creator | Creates `GroupState` PDA. Sets payout, member count, interval. Auto-calculates contribution and collateral. Collects gas reserve + platform fee. |
| `join_group` | Member | Creates `MemberState` PDA. Deposits collateral (= payout amount) to vault. Adds wallet to rotation list. |
| `start_cycle` | Server (keeper) | Triggered when group is full. Sets Round 1 deadline based on interval. |
| `contribute` | Member | Member sends contribution (`payout / members` SOL) for the current round. Updates `RoundState`. |
| `auto_pull` | Server (keeper) | After grace period, pulls exact contribution from defaulter's collateral. Pool is made whole. |
| `execute_payout` | Server (keeper) | When all contributions settled, sends payout to round recipient minus 0.5% platform fee. |
| `refund_collateral` | Server (keeper) | After final round, returns each member's remaining collateral balance to their wallet. |

---

## 12.3 Account Structure (Rust)

```rust
#[account]
pub struct GroupState {
    pub admin: Pubkey,
    pub name: String,           // max 32 chars
    pub member_count: u8,       // 2–20
    pub payout_amount: u64,     // in lamports
    pub contribution_amount: u64, // payout / member_count
    pub collateral_amount: u64, // = payout_amount
    pub round_interval: u8,     // 0 = weekly, 1 = monthly
    pub current_round: u8,
    pub members: Vec<Pubkey>,   // rotation order
    pub status: GroupStatus,    // Filling | Active | Completed
    pub bump: u8,
}

#[account]
pub struct MemberState {
    pub wallet: Pubkey,
    pub group: Pubkey,
    pub collateral_balance: u64,   // starts at payout_amount
    pub rotation_position: u8,
    pub joined_at: i64,
    pub bump: u8,
}

#[account]
pub struct RoundState {
    pub group: Pubkey,
    pub round_number: u8,
    pub due_timestamp: i64,
    pub grace_end_timestamp: i64,
    pub contributions_received: Vec<bool>, // bitmap per member
    pub payout_sent: bool,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum GroupStatus {
    Filling,
    Active,
    Completed,
}
```

---

## 12.4 Key Validation Logic

```rust
// join_group — validate collateral matches group requirement
require!(
    ctx.accounts.member.lamports() >= group.collateral_amount,
    AjoError::InsufficientCollateral
);

// contribute — validate exact contribution amount
require!(
    amount == group.contribution_amount,
    AjoError::InvalidContributionAmount
);

// auto_pull — only callable after grace period
require!(
    Clock::get()?.unix_timestamp >= round.grace_end_timestamp,
    AjoError::GracePeriodNotExpired
);

// execute_payout — only when all contributions settled
require!(
    round.contributions_received.iter().all(|&paid| paid),
    AjoError::ContributionsMissing
);
```

---

## 12.5 PDA Seeds

```rust
// Group vault
seeds = [b"vault", group_state.key().as_ref()]

// Group state
seeds = [b"group", admin.key().as_ref(), name.as_bytes()]

// Member state
seeds = [b"member", group.key().as_ref(), member.key().as_ref()]

// Round state
seeds = [b"round", group.key().as_ref(), &[round_number]]
```

---

## 12.6 Security Model

- **PDA-controlled funds** — all SOL in the vault is held by a PDA. No private key can drain it.
- **Only the program can sign** — vault transfers are authorized via PDA seeds, not a wallet.
- **Immutable parameters** — payout, member count, collateral, and interval are frozen after the first member joins.
- **On-chain rotation** — payout order stored on-chain, cannot be changed by anyone including the admin.
- **Signer verification** — every member-specific instruction verifies the caller's wallet matches the expected member.
- **Amount validation** — contribution and collateral amounts validated against stored `GroupState` values on every call.

---

*Next: [Frontend Design →](13-frontend.md)*
