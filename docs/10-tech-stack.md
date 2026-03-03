# 10 — Tech Stack (100% Free Tier)

[← Back to README](../README.md) | [← Fee Structure](09-fee-structure.md)

---

## 10.1 Smart Contract Layer

| Technology | Purpose | Free Tier |
|-----------|---------|-----------|
| [Solana](https://solana.com) | Distributed ledger for all transactions | Devnet is free |
| [Anchor Framework](https://anchor-lang.com) | Rust-based smart contract framework for Solana | Open source |
| [Rust](https://rust-lang.org) | Smart contract language | Open source |
| [Solana CLI](https://docs.solana.com/cli) | Deploy and interact with programs | Free |

---

## 10.2 Frontend Layer

| Technology | Purpose | Free Tier |
|-----------|---------|-----------|
| [Next.js 14](https://nextjs.org) | React framework — SSR, routing, API routes | Open source |
| [Tailwind CSS](https://tailwindcss.com) | Utility-first styling | Open source |
| [next-pwa](https://github.com/shadowwalker/next-pwa) | PWA support: service worker, push notifications, install prompt | Open source |
| [@solana/wallet-adapter](https://github.com/solana-labs/wallet-adapter) | Wallet connection (Phantom, Solflare, Backpack, etc.) | Open source |
| [@project-serum/anchor](https://github.com/coral-xyz/anchor) | Frontend SDK to call Anchor programs | Open source |
| [shadcn/ui](https://ui.shadcn.com) | Component library built on Radix UI | Open source |
| [Vercel](https://vercel.com) | Frontend hosting, deployment, HTTPS | Free hobby tier |

---

## 10.3 Backend / Off-Chain Layer

| Technology | Purpose | Free Tier |
|-----------|---------|-----------|
| [Node.js](https://nodejs.org) | Off-chain server — notifications, event monitoring | Open source |
| [Railway.app](https://railway.app) | Backend hosting | Free $5/mo credit |
| [PostgreSQL](https://postgresql.org) (via Railway) | Stores wallet–email/Telegram links, notification state, sent log | Free on Railway |
| [Prisma ORM](https://prisma.io) | Database access layer | Open source |
| [Resend.com](https://resend.com) | Email notifications — optional channel | Free 3,000 emails/mo |
| [Telegram Bot API](https://core.telegram.org/bots/api) | Telegram notifications — optional channel | Completely free, no limits |
| [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API) | PWA push notifications — active by default | Free, built into browser |
| [node-cron](https://github.com/node-cron/node-cron) | Scheduled jobs for T-48hr and T-24hr notification dispatch | Open source |

---

## 10.4 Solana RPC Providers (Free Options)

| Provider | Free Tier | Notes |
|---------|-----------|-------|
| [Helius](https://helius.dev) | 100k requests/day + WebSocket events | Best free option for Solana |
| [QuickNode](https://quicknode.com) | 10M requests/mo | Reliable, good dashboard |
| [Alchemy](https://alchemy.com) | 300M compute units/mo | Supports Solana |
| Solana Public RPC | Unlimited (rate limited) | Development only |

> **Recommended:** Helius — supports WebSocket subscriptions needed for real-time event monitoring (contributions, payouts, auto-pulls).

---

## 10.5 Total Monthly Cost at Launch

| Service | Free Tier Limit | Cost |
|---------|----------------|------|
| Vercel (frontend) | Unlimited hobby projects | $0 |
| Railway (backend + DB) | $5/mo credit | $0 |
| Helius (RPC) | 100k req/day | $0 |
| Resend (email) | 3,000 emails/mo | $0 |
| Telegram Bot API | No limits | $0 |
| Web Push API | Browser-native | $0 |
| Solana Devnet | Free | $0 |
| **Total** | | **$0/month** |

---

*Next: [Architecture Overview →](11-architecture.md)*
