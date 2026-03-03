# 09 — Fee Structure

[← Back to README](../README.md) | [← Notifications](08-notifications.md)

---

## 9.1 Solana Network Fees (Reality Check)

Solana has some of the lowest transaction fees in blockchain. All costs below assume ~$150/SOL:

| Fee Type | Cost in SOL | Cost in USD |
|----------|------------|------------|
| Base transaction fee | 0.000005 SOL | ~$0.00075 |
| Smart contract call (with priority fee) | ~0.00002 SOL | ~$0.003 |
| Account creation (rent) | ~0.002 SOL | ~$0.30 |

> Account rent is **refundable** when the group vault account is closed at cycle end.

---

## 9.2 Transaction Count Per Group

Every on-chain action costs one transaction. Here is the full count for a complete cycle:

| Action | Count |
|--------|-------|
| Create group (initialize vault) | 1 |
| Each member joins + deposits collateral | N |
| Each round: N contributions | N × N |
| Each round: 1 payout transfer | N |
| Each default auto-pull (worst case: all members all rounds) | N × N |
| End of cycle: collateral refunds | N |
| **Total (no defaults)** | **1 + N + N² + N + N** |

| Group Size | Total Transactions (no defaults) | Gas Reserve (2× buffer) |
|------------|--------------------------------|------------------------|
| 2 members | ~11 | 0.0011 SOL |
| 5 members | ~41 | 0.0041 SOL |
| 10 members | ~141 | 0.0141 SOL |
| 20 members | ~461 | 0.0461 SOL |

The **2× buffer** covers worst-case defaults where additional auto-pull transactions fire every round.

---

## 9.3 Platform Fee Model

| Fee | Amount | When Collected |
|-----|--------|---------------|
| Gas Reserve | Auto-calculated per group size | At group creation (creator pays) |
| Account Rent | ~0.002 SOL | At creation (refunded at cycle end) |
| Platform Creation Fee | 0.01 SOL (~$1.50) | At group creation |
| Platform Payout Fee | 0.5% of each payout | Deducted before each payout transfer |

### Example — 10-member group, 2 SOL payout

| Item | Amount |
|------|--------|
| Gas Reserve | 0.015 SOL |
| Account Rent | 0.002 SOL (refunded later) |
| Platform Creation Fee | 0.01 SOL |
| **Total creator pays at setup** | **0.027 SOL (~$4.05)** |
| Platform earns per round (0.5% × 2 SOL) | 0.01 SOL |
| **Total platform revenue for full cycle** | **0.10 SOL (~$15)** |

---

## 9.4 Fund Flow Summary

```
Group Creation:
Creator wallet
  ├── Gas Reserve         → Vault (used for autonomous tx fees)
  ├── Account Rent        → Vault (refunded at cycle end)
  └── Platform Fee        → Platform wallet

Member Joining:
Each member wallet
  └── Collateral (= payout) → Vault (locked entire cycle)

Each Round:
Each member wallet
  └── Contribution         → Vault (contribution pool)

Payout:
Vault
  ├── 99.5% of pool        → Round recipient wallet
  └── 0.5% of pool         → Platform wallet

Cycle End:
Vault
  └── Remaining collateral → Each member's wallet
  └── Remaining gas reserve → Creator wallet
  └── Account rent          → Creator wallet
```

---

*Next: [Tech Stack →](10-tech-stack.md)*
