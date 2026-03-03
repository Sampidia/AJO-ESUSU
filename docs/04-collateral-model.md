# 04 — Financial Logic & Dynamic Collateral Model

[← Back to README](../README.md) | [← Group Setup](03-group-setup.md)

---

## 4.1 The Universal Formula

The admin sets the payout amount and member count. Everything else is auto-calculated:

| Formula | Example 1 | Example 2 | Example 3 |
|---------|-----------|-----------|-----------|
| Payout (admin sets) | 1 SOL | 2 SOL | 5 SOL |
| Members (admin sets) | 5 | 10 | 8 |
| Contribution / member | 0.2 SOL | 0.2 SOL | 0.625 SOL |
| Rounds in cycle | 5 | 10 | 8 |
| **Collateral (= Payout)** | **1 SOL** | **2 SOL** | **5 SOL** |
| Collateral covers all rounds? | 5×0.2=1 ✅ | 10×0.2=2 ✅ | 8×0.625=5 ✅ |

**Rule: Collateral always equals the payout amount.** This is universally self-balancing — no matter what numbers the admin picks, the collateral always exactly covers every member's total contribution liability for the full cycle.

### Why This Works

```
Collateral     = Payout Amount
Payout Amount  = Members × Contribution
∴ Collateral   = Members × Contribution
               = Total contribution liability per member

A member can default on EVERY single round and their
collateral covers every missed payment exactly.
```

---

## 4.2 Vault Collateral — Locked The Entire Cycle

Collateral is **never released early**, even after a member receives their payout. An early recipient (e.g. Member A who gets paid in Round 1) still owes contributions for all remaining rounds. Their collateral stays locked as the guarantee.

| Round | Vault Collateral | Event | Payout To | Collateral Released |
|-------|-----------------|-------|-----------|-------------------|
| Pre-game | N × Payout | All members joined | — | No |
| Round 1 | N × Payout | All contribute or auto-pull | Member A | No |
| Round 2 | N × Payout | All contribute or auto-pull | Member B | No |
| ... | N × Payout | ... | ... | No |
| Final Round | N × Payout | All contribute or auto-pull | Member N | **YES — all members** |

---

## 4.3 Net Position Every Member (Honest Cycle)

| Flow | Formula | Direction |
|------|---------|-----------|
| Collateral deposited | = Payout amount | Out |
| Contributions (all rounds) | = Rounds × (Payout ÷ Members) = Payout | Out |
| Payout received | = Payout amount | In |
| Collateral refunded | = Payout amount | In |
| **Net** | **0 SOL always** | — |

> The system is **zero-sum by design**. The value is lump-sum access at your rotation turn, not profit.

---

## 4.4 The Collateral Protects Unpaid Members Only

Collateral serves one purpose: **guaranteeing the payout pool is always full every round**, protecting members who have not yet received their payout. Once collateral has covered all missed contributions for the cycle, any remaining amount is refunded to the member.

| Defaulter Type | Collateral Role |
|---------------|----------------|
| Defaults after receiving payout | Covers remaining contributions so unpaid members aren't shorted |
| Defaults before receiving payout | Covers missed contributions; member still receives full payout at their turn |
| Never contributes manually | Collateral fully consumed; member still receives payout at their turn |

---

*Next: [Round Flow & Payout Automation →](05-round-flow.md)*
