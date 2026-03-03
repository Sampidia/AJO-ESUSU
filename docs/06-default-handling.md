# 06 — Default Handling & Auto-Pull

[← Back to README](../README.md) | [← Round Flow](05-round-flow.md)

---

## 6.1 Philosophy

> The default system is **protective, not punitive**.

The sole goal is ensuring the payout pool is fully funded every round regardless of individual member behaviour. A defaulter's collateral is their **own money covering their own obligation**. No penalties, no cancellations, no punishment.

---

## 6.2 Auto-Pull Flow

```
T-24hrs  →  Warning sent to all active notification channels
             "Your contribution is due in 24 hours.
              Pay now to avoid auto-pull from your collateral."

T=0      →  Contribution deadline.
             Member can STILL pay manually — auto-pull has not triggered yet.

T+24hrs  →  Grace period expires.
             Smart contract auto-pulls the exact contribution amount
             from the member's locked collateral.

T+25hrs  →  Pool is full regardless of who paid manually.
             Payout proceeds normally.
             The round recipient is never affected.
```

---

## 6.3 Collateral Depletion Tracking

Each auto-pull reduces the member's collateral balance. The remaining collateral is always refunded at cycle end.

Example — **2 SOL payout, 10 members, 0.2 SOL contribution/round**:

| Rounds Defaulted | Collateral Used | Collateral Returned |
|-----------------|----------------|-------------------|
| 0 (fully honest) | 0 SOL | 2.0 SOL (full refund) |
| 1 round | 0.2 SOL | 1.8 SOL |
| 3 rounds | 0.6 SOL | 1.4 SOL |
| 5 rounds | 1.0 SOL | 1.0 SOL |
| All 10 rounds | 2.0 SOL (fully consumed) | 0 SOL |

---

## 6.4 The Key Guarantee

> **Collateral = Payout Amount = Total contribution liability per member.**

A member can default on every single round and their collateral covers every missed payment exactly. The cycle **never cancels** due to any single member defaulting.

---

## 6.5 What Happens to a Defaulter's Payout?

The defaulter **still receives their full payout** when it is their rotation turn. Their collateral covered their missed contributions — so the group was never shorted. The payout is not reduced or docked.

| Member Behaviour | Receives Payout? | Collateral Returned? |
|-----------------|-----------------|---------------------|
| Pays all rounds honestly | ✅ Yes | ✅ Full amount |
| Defaults some rounds (collateral covers) | ✅ Yes | ✅ Remaining amount |
| Defaults all rounds (collateral fully consumed) | ✅ Yes | ❌ Nothing remaining |

---

## 6.6 Notification Channels for Default Warnings

All active channels fire simultaneously for the T-24hr warning:

| Channel | Status | When Sent |
|---------|--------|-----------|
| In-App Bell | Always active | Seen on next app open |
| PWA Push | Active if PWA installed | Immediately on device |
| Email | If user opted in | Immediately |
| Telegram | If user opted in | Immediately |

See [Notification System →](08-notifications.md) for full channel details.

---

*Next: [Scenario Simulations →](07-scenarios.md)*
