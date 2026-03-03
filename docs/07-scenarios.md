# 07 — Scenario Simulations

[← Back to README](../README.md) | [← Default Handling](06-default-handling.md)

---

> All scenarios below use: **5 members | 1 SOL payout | 0.2 SOL contribution/round | 1 SOL collateral**

---

## Scenario 7a — Normal Cycle: All Members Pay Honestly

| Round | Contributions | Pool | Payout To | Vault Collateral |
|-------|-------------|------|-----------|-----------------|
| R1 | 5 × 0.2 = 1 SOL | 1 SOL | Member A | 5 SOL locked |
| R2 | 5 × 0.2 = 1 SOL | 1 SOL | Member B | 5 SOL locked |
| R3 | 5 × 0.2 = 1 SOL | 1 SOL | Member C | 5 SOL locked |
| R4 | 5 × 0.2 = 1 SOL | 1 SOL | Member D | 5 SOL locked |
| R5 | 5 × 0.2 = 1 SOL | 1 SOL | Member E | 5 SOL → refunded |

**Every member:** out = 1 SOL collateral + 1 SOL contributions = 2 SOL. In = 1 SOL payout + 1 SOL collateral = 2 SOL. **Net = 0.**

---

## Scenario 7b — Early Recipient (A) Defaults After Round 1

A receives payout in R1 then stops contributing.

| Round | A's Action | A's Collateral | Pool Full? | Payout Sent? |
|-------|-----------|--------------|-----------|-------------|
| R1 | Pays 0.2 + receives payout | 1.0 SOL | YES | YES to A |
| R2 | Defaults — auto-pull | 0.8 SOL | YES | YES to B |
| R3 | Defaults — auto-pull | 0.6 SOL | YES | YES to C |
| R4 | Defaults — auto-pull | 0.4 SOL | YES | YES to D |
| R5 | Defaults — auto-pull | 0.2 SOL | YES | YES to E |

**A's final settlement:**

| Item | Amount |
|------|--------|
| Collateral deposited | -1.0 SOL |
| R1 contribution (manual) | -0.2 SOL |
| R2–R5 auto-pulled from collateral | -0.8 SOL |
| Payout received (R1) | +1.0 SOL |
| Collateral refund (0.2 remaining) | +0.2 SOL |
| **NET** | **0 SOL — zero benefit from defaulting** |

---

## Scenario 7c — Late Recipient (E) Defaults in Round 3

E contributed R1 and R2 honestly. Defaults R3 and R4. E is the last payout recipient (R5).

| Round | E's Action | E's Collateral | Pool Full? | Payout Sent? |
|-------|-----------|--------------|-----------|-------------|
| R1 | Pays 0.2 SOL | 1.0 SOL | YES | YES to A |
| R2 | Pays 0.2 SOL | 1.0 SOL | YES | YES to B |
| R3 | Defaults — auto-pull | 0.8 SOL | YES | YES to C |
| R4 | Defaults — auto-pull | 0.6 SOL | YES | YES to D |
| R5 | E's payout round | 0.6 SOL remaining | YES | YES to E — **full 1 SOL** |

**E's final settlement:**

| Item | Amount |
|------|--------|
| Collateral deposited | -1.0 SOL |
| R1+R2 contributions (manual) | -0.4 SOL |
| R3+R4 auto-pulled from collateral | -0.4 SOL |
| Payout received (R5) — **full amount** | +1.0 SOL |
| Collateral refund (0.6 remaining) | +0.6 SOL |
| **NET** | **0 SOL — E still gets full payout. No penalty.** |

> E receives the full payout because all contributions were settled — manually (R1, R2) or via collateral (R3, R4). The payout is **not** reduced. Collateral did its job.

---

## Scenario 7d — Complete Defaulter: A Never Pays Manually

A deposits collateral but never manually contributes a single round.

| Round | A's Action | A's Collateral | Pool Full? | A Gets Payout? |
|-------|-----------|--------------|-----------|--------------|
| R1 | Auto-pull 0.2 | 0.8 SOL | YES | YES — 1 SOL (R1 recipient) |
| R2 | Auto-pull 0.2 | 0.6 SOL | YES | N/A |
| R3 | Auto-pull 0.2 | 0.4 SOL | YES | N/A |
| R4 | Auto-pull 0.2 | 0.2 SOL | YES | N/A |
| R5 | Auto-pull 0.2 | 0.0 SOL | YES | N/A |

**A's final settlement:**

| Item | Amount |
|------|--------|
| Collateral deposited | -1.0 SOL |
| All 5 rounds via auto-pull (collateral fully consumed) | -1.0 SOL |
| Payout received (R1) | +1.0 SOL |
| Collateral refund | 0 SOL (fully consumed) |
| **NET** | **0 SOL — zero benefit from never paying manually** |

---

## Scenario 7e — Two Simultaneous Defaults: A and C Both Default from R4

A was paid in R1. C was paid in R3. Both stop contributing from R4 onwards.

| Round | A Collateral | C Collateral | Pool Full? | Payout Sent? |
|-------|------------|------------|-----------|-------------|
| R1 | 1.0 SOL | 1.0 SOL | YES | YES to A |
| R2 | 1.0 SOL | 1.0 SOL | YES | YES to B |
| R3 | 1.0 SOL | 1.0 SOL | YES | YES to C |
| R4 | 0.8 SOL (pull) | 0.8 SOL (pull) | YES | YES to D |
| R5 | 0.6 SOL (pull) | 0.6 SOL (pull) | YES | YES to E |

Both A and C receive 0.6 SOL collateral refund. Both net 0 SOL.

> Each member's collateral covers their own liability **independently** — they never touch each other's funds. Even with multiple simultaneous defaults, the cycle completes perfectly.

---

## Summary: No Strategy Beats Honest Participation

| Member Strategy | Group Affected? | Net for Defaulter |
|----------------|----------------|------------------|
| Pay everything honestly | ❌ No | 0 SOL (full collateral back) |
| Default after receiving payout | ❌ No | 0 SOL (partial collateral back) |
| Default before receiving payout | ❌ No | 0 SOL (full payout still received) |
| Never contribute a single round | ❌ No | 0 SOL (collateral fully consumed) |
| Multiple simultaneous defaults | ❌ No | 0 SOL each (independent coverage) |

---

*Next: [Notification System →](08-notifications.md)*
