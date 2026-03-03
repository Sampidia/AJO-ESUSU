# 03 — Group Setup Rules

[← Back to README](../README.md) | [← Terminology](02-terminology.md)

---

## 3.1 Group Creation Parameters

The group creator (admin) defines the following at creation time. These parameters are **immutable once the first member joins**.

| Parameter | Set By | Value / Options | Notes |
|-----------|--------|----------------|-------|
| Group Name | Admin | String, max 32 chars | Stored on-chain |
| Max Members | Admin | 2 – 20 | = Total rounds in cycle |
| Payout Amount | **Admin** | e.g. 0.5 / 1 / 2 / 5 SOL | Total paid to recipient per round |
| Contribution / member | **Auto-calculated** | `Payout ÷ Members` | e.g. 2 SOL / 10 members = 0.2 SOL |
| Collateral Amount | **Auto-calculated** | `= Payout Amount` | Always covers full liability |
| Round Interval | Admin | Weekly or Monthly | Fixed at creation |
| Start Condition | Automatic | All slots filled | Cycle auto-starts when full |

> **The admin only sets two numbers: payout amount and member count. Everything else is derived automatically.**

---

## 3.2 Member Joining

- Members join via a unique invite link: `ajo.app/join/[groupId]`
- Joining requires connecting a Solana wallet and depositing collateral (= payout amount) in a **single transaction**
- Rotation order is determined by join timestamp — **first join = first payout recipient**
- Once the group is full, the cycle starts automatically at the next scheduled interval
- No member can join after the cycle has started

---

## 3.3 Pre-Cycle Vault State

Before Round 1 begins the vault holds the following. Example: **2 SOL payout, 10 members**:

| Item | Formula | Example Value |
|------|---------|--------------|
| Total Collateral Locked | Members × Payout | 10 × 2 SOL = **20 SOL** |
| Contribution per member/round | Payout ÷ Members | 2 ÷ 10 = **0.2 SOL** |
| Gas Reserve | Auto-calc per group size | ~0.015 SOL (creator pays) |
| Platform Fee | 0.01 SOL flat | 0.01 SOL at creation |
| Contribution Pool | Fills each round | 0 SOL until Round 1 |

> **Note:** Collateral stays locked for the **entire cycle**. It is only released after ALL rounds are complete and ALL members have received their payout.

---

## 3.4 Group Lifecycle States

```
CREATED     → Admin created group, no members yet
FILLING     → Members joining, depositing collateral
ACTIVE      → All slots filled, cycle running
COMPLETED   → All rounds done, collateral refunded
```

---

*Next: [Financial Logic & Collateral Model →](04-collateral-model.md)*
