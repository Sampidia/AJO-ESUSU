# 05 — Round Flow & Payout Automation

[← Back to README](../README.md) | [← Collateral Model](04-collateral-model.md)

---

## 5.1 Round Lifecycle

Each round follows a strict automated sequence enforced by the smart contract and off-chain notification server:

| Step | Action | Actor |
|------|--------|-------|
| **T-48hrs** | Round reminder sent via all active channels (PWA Push, In-App Bell, Email, Telegram) | Server |
| **T-24hrs** | Final warning: "Pay now or collateral auto-pulled in 24hrs" | Server |
| **T=0 (Due)** | Contribution window open. Members submit their share to the vault | Members |
| **T+24hrs** | Grace period ends. Contract auto-pulls from collateral for any unpaid member | Contract |
| **T+25hrs** | Payout dispatched to round recipient's wallet (minus 0.5% platform fee) | Contract |
| **T+26hrs** | Round closed. Next round deadline set automatically | Contract |

---

## 5.2 Payout Recipient Order

Rotation is fixed at group creation based on join order. The smart contract stores an ordered list of wallet addresses and cycles through them sequentially.

Example — **2 SOL payout, 5 members**:

| Round | Recipient | Payout | Contribution / member |
|-------|-----------|--------|----------------------|
| Round 1 | Member A (first to join) | 2 SOL | 0.4 SOL |
| Round 2 | Member B | 2 SOL | 0.4 SOL |
| Round 3 | Member C | 2 SOL | 0.4 SOL |
| Round 4 | Member D | 2 SOL | 0.4 SOL |
| Round 5 | Member E (last to join) | 2 SOL | 0.4 SOL |

---

## 5.3 Round Interval Options

| Interval | Contribution Due | Next Round Starts |
|----------|----------------|------------------|
| Weekly | Every 7 days | 7 days after previous payout |
| Monthly | Every 30 days | 30 days after previous payout |

The interval is set by the admin at group creation and cannot be changed once the cycle starts.

---

## 5.4 What Triggers Automatic Execution

The smart contract cannot self-execute — it requires a transaction call. The off-chain Node.js server acts as the **keeper**, calling the contract at the right time:

```
Off-chain server (Node.js cron job):
  ├── T-48hrs → send notifications only
  ├── T-24hrs → send warnings only
  ├── T+24hrs → call auto_pull instruction for any defaulters
  └── T+25hrs → call execute_payout instruction
```

> **Important:** Even if the notification server goes down, the on-chain state is safe. The auto-pull and payout can be triggered by anyone calling the contract once the grace period has passed.

---

*Next: [Default Handling & Auto-Pull →](06-default-handling.md)*
