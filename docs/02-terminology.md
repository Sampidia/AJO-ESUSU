# 02 — Core Concepts & Terminology

[← Back to README](../README.md) | [← Overview](01-overview.md)

---

## Glossary

| Term | Definition |
|------|-----------|
| **Ajo / Esusu** | Traditional rotating community savings group practised across West Africa |
| **Cycle** | One full rotation where every member receives the payout exactly once |
| **Round** | A single contribution + payout event within a cycle. Total rounds = total members |
| **Payout Amount** | Set by the group admin. The total SOL paid to the recipient each round |
| **Contribution per member** | Auto-calculated: `Payout Amount ÷ Number of Members`. Each member pays this per round |
| **Collateral** | `= Payout Amount`. Locked per member upfront before the cycle starts. Always exactly covers their total contribution liability for all rounds |
| **Auto-Pull** | Automatic deduction from a defaulter's locked collateral after the 24-hour grace period expires |
| **Rotation Order** | Fixed at group creation based on join timestamp. First to join = first payout recipient |
| **Round Interval** | Set by the group admin at creation: Weekly or Monthly |
| **Vault** | The smart contract PDA (Program Derived Address) account that holds all funds — collateral and contributions — in escrow |
| **PDA** | Program Derived Address. A Solana account whose authority is the smart contract program, not a private key |
| **Gas Reserve** | Pre-funded SOL to cover all on-chain transaction fees for the entire cycle. Paid by the creator at group creation |
| **PWA** | Progressive Web App. The web app installed on a mobile home screen, enabling native-style push notifications |
| **In-App Bell** | Notification indicator shown on the dashboard whenever the user opens the app. Always active, no setup required |
| **Devnet** | Solana test network for development and testing. Uses fake SOL from a faucet |
| **Mainnet** | Solana production network with real SOL |
| **Anchor** | Rust-based framework for writing Solana smart contracts |

---

## Key Formula Reference

```
Collateral     = Payout Amount
Contribution   = Payout Amount ÷ Members
Total Rounds   = Number of Members
Liability/member = Rounds × Contribution = Payout Amount = Collateral ✓
```

---

*Next: [Group Setup Rules →](03-group-setup.md)*
