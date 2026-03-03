# 01 — Project Overview

[← Back to README](../README.md)

---

## What Is Ajo / Esusu?

Ajo (Yoruba) and Esusu (Igbo) are traditional rotating savings systems practised across West Africa and its diaspora. A trusted group of people each contribute a fixed amount every period. The total pool is paid to one member per period in rotation — guaranteeing every member access to a meaningful lump sum at least once per cycle.

---

## The Problem With Traditional Ajo

The traditional model depends entirely on **trust and social pressure**. When someone receives their payout early and then stops contributing, the whole group suffers. There is no enforceable guarantee.

Common failures:
- Early recipients disappear after receiving their payout
- Coordinators mismanage or steal the pool
- No transparent record of who paid what
- No automated reminders or enforcement

---

## The Solution — Ajo on Solana

This project digitises the Ajo / Esusu model on the **Solana blockchain**, replacing trust-based enforcement with cryptographic guarantees via a smart contract.

### Key Innovations

| Innovation | Detail |
|-----------|--------|
| Dynamic collateral | Collateral = payout amount. Auto-calculated for any group config. |
| Automated payouts | Smart contract executes payouts on schedule, no coordinator needed |
| Transparent ledger | Every transaction publicly verifiable on-chain |
| Auto-pull protection | Missed contributions pulled from member's own locked collateral |
| 4-channel notifications | PWA Push + In-App Bell (default) + Email + Telegram (optional) |
| Zero cancellation | Collateral covers full liability — cycle never cancels |

---

## How It Works (Simple Version)

```
1. Admin creates a group
   → Sets payout amount and number of members
   → System calculates contribution per member and collateral required

2. Members join
   → Each deposits collateral (= payout amount) to the vault
   → Join order = payout rotation order

3. Cycle begins (all slots filled)
   → Every round: each member contributes their share
   → Round recipient receives the full payout
   → Collateral stays locked the entire cycle

4. Default protection
   → Member gets 24hr warning via all active notification channels
   → If still unpaid after grace period, contract auto-pulls from their collateral
   → Round always completes on time regardless

5. Cycle ends
   → Last member receives their payout
   → All collateral refunded to every member
   → Everyone nets zero — the benefit was lump-sum access
```

---

## The Zero-Sum Principle

> Every member nets exactly 0 SOL at the end of a complete cycle.

The value is **not profit** — it's access to a lump sum at your rotation turn. Instead of saving 0.2 SOL per round for 10 rounds and ending up with 2 SOL, a member receives that 2 SOL all at once at their rotation turn. This is the financial utility of the system.

---

## Who Is This For?

- Community savings groups in Nigeria, Ghana, and across the West African diaspora
- Crypto-native users wanting a trustless version of a familiar savings system
- Anyone in a trusted group who wants structured lump-sum savings with blockchain transparency

---

*Next: [Core Concepts & Terminology →](02-terminology.md)*
