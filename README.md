# Ajo / Esusu — Community Savings on Solana

> Digitising traditional West African rotating savings groups (Ajo/Esusu) on the Solana blockchain.

![Version](https://img.shields.io/badge/version-2.0-purple)
![Network](https://img.shields.io/badge/network-Solana-green)
![Stack](https://img.shields.io/badge/stack-Anchor%20%7C%20Next.js%20%7C%20Node.js-blue)
![License](https://img.shields.io/badge/license-MIT-orange)

---

## What Is Ajo / Esusu?

Ajo (Yoruba) and Esusu (Igbo) are traditional rotating savings systems practised across West Africa and its diaspora. A trusted group of people each contribute a fixed amount every period. The total pool is paid to one member per period in rotation — guaranteeing every member access to a meaningful lump sum at least once per cycle.

This project digitises that model on **Solana**, replacing trust-based enforcement with cryptographic guarantees via a smart contract.

---

## Key Features

- **Dynamic collateral** — collateral is automatically set equal to the admin's chosen payout amount, perfectly covering each member's full contribution liability for any group size
- **Automated rotational payouts** — smart contract executes payouts on schedule, no trusted coordinator needed
- **Transparent on-chain ledger** — all contributions, collateral movements and payouts are publicly verifiable
- **4-channel notifications** — PWA Push and In-App Bell active by default; Email (Resend) and Telegram Bot as optional opt-in channels
- **Auto-pull default protection** — missed contributions are automatically covered from the member's locked collateral after a 24-hour grace period
- **Zero cancellation guarantee** — collateral always equals total contribution liability; the cycle never cancels due to a single member defaulting

---

## The Core Formula

```
Payout Amount     → Set by group admin (e.g. 2 SOL)
Number of Members → Set by group admin (e.g. 10)
Contribution      → Auto-calculated: Payout / Members = 0.2 SOL
Collateral        → Auto-calculated: = Payout Amount = 2 SOL
                    (covers 10 rounds × 0.2 SOL = 2 SOL exactly)
```

**Collateral always equals the payout amount.** This is universally self-balancing for any combination the admin chooses.

---

## Quick Example (2 SOL payout, 10 members)

| Round | Recipient | Each Member Pays | Pool | Vault Collateral |
|-------|-----------|-----------------|------|-----------------|
| Pre-game | — | 2 SOL collateral | — | 20 SOL locked |
| Round 1 | Member A | 0.2 SOL | 2 SOL | 20 SOL locked |
| Round 2 | Member B | 0.2 SOL | 2 SOL | 20 SOL locked |
| ... | ... | 0.2 SOL | 2 SOL | 20 SOL locked |
| Round 10 | Member J | 0.2 SOL | 2 SOL | 20 SOL → refunded |

Every member nets **0 SOL** at cycle end. The value is lump-sum access at your rotation turn.

---

## Tech Stack (100% Free Tier)

| Layer | Technology |
|-------|-----------|
| Smart Contract | Anchor (Rust) on Solana |
| Frontend | Next.js 14 + Tailwind CSS + shadcn/ui |
| PWA | next-pwa (push notifications) |
| Wallet | @solana/wallet-adapter |
| Backend | Node.js on Railway.app |
| Database | PostgreSQL on Railway |
| Email Notifications | Resend.com (3,000/mo free) |
| Telegram Notifications | Telegram Bot API (free, no limits) |
| Hosting | Vercel (frontend) + Railway (backend) |
| Solana RPC | Helius (100k req/day free) |

---

## Documentation

| # | Document | Description |
|---|----------|-------------|
| 01 | [Project Overview](docs/01-overview.md) | What the app is and why it works |
| 02 | [Terminology](docs/02-terminology.md) | Every term defined |
| 03 | [Group Setup](docs/03-group-setup.md) | Creation params, joining, vault state |
| 04 | [Collateral Model](docs/04-collateral-model.md) | The dynamic collateral formula |
| 05 | [Round Flow](docs/05-round-flow.md) | Step-by-step round lifecycle |
| 06 | [Default Handling](docs/06-default-handling.md) | Auto-pull system |
| 07 | [Scenarios](docs/07-scenarios.md) | 5 full simulations with tables |
| 08 | [Notifications](docs/08-notifications.md) | All 4 channels explained |
| 09 | [Fee Structure](docs/09-fee-structure.md) | Gas reserve and platform fees |
| 10 | [Tech Stack](docs/10-tech-stack.md) | Every tool with free tier details |
| 11 | [Architecture](docs/11-architecture.md) | System layers and data flow |
| 12 | [Smart Contract](docs/12-smart-contract.md) | Anchor/Rust program design |
| 13 | [Frontend](docs/13-frontend.md) | Next.js pages and components |
| 14 | [Wallet Strategy](docs/14-wallet-strategy.md) | Dual access model |
| 15 | [Deployment](docs/15-deployment.md) | 3-phase rollout plan |
| 16 | [Security](docs/16-security.md) | Security model and limitations |

---

## Project Status

- [x] Product logic defined and simulated
- [x] Documentation complete (v2.0)
- [x] Anchor smart contract — 100% complete
- [x] Next.js frontend — 100% complete
- [x] Devnet deployment — functional
- [ ] Notification server — pending
- [ ] Mainnet launch — pending

---

## Getting Started (Coming Soon)

```bash
# Clone the repo
git clone https://github.com/yourusername/ajo-esusu-solana.git
cd ajo-esusu-solana

# Install dependencies
npm install

# Run frontend
npm run dev
```

Smart contract setup and deployment instructions will be added when the Anchor program is ready.

---

## License

MIT — see [LICENSE](LICENSE)

---

*Built with ❤️ for community savings groups across West Africa and the diaspora.*
