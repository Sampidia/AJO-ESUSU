# 15 — Deployment Plan

[← Back to README](../README.md) | [← Wallet Strategy](14-wallet-strategy.md)

---

## Phase 1 — Development (Devnet)

> Goal: Fully working app on Solana Devnet with fake SOL.

| Step | Action | Tool |
|------|--------|------|
| 1 | Write Anchor smart contract with dynamic payout/collateral logic | Anchor + Rust |
| 2 | Write contract tests (unit + integration) | Anchor test framework |
| 3 | Deploy to Solana Devnet | Solana CLI |
| 4 | Build Next.js frontend — all pages and components | Next.js |
| 5 | Connect frontend to Devnet via Helius RPC | @solana/wallet-adapter |
| 6 | Add PWA support (service worker, manifest, push) | next-pwa |
| 7 | Build notification server with all 4 channels | Node.js + Railway |
| 8 | End-to-end testing with multiple wallets | Devnet faucet SOL |
| 9 | Test all default scenarios from the simulation docs | Manual QA |

**Devnet SOL faucet:** https://faucet.solana.com

---

## Phase 2 — Beta (Mainnet, Invite Only)

> Goal: Real SOL, small trusted groups, validate everything works.

| Step | Action | Tool |
|------|--------|------|
| 1 | Security review of smart contract | Manual + community peer review |
| 2 | Deploy to Solana Mainnet | Solana CLI |
| 3 | Deploy frontend to Vercel (production) | Vercel |
| 4 | Deploy notification server to Railway (production) | Railway |
| 5 | Launch with 2–5 member groups only (invite only) | Invite links |
| 6 | Monitor all transactions and notifications live | Helius + Railway logs |
| 7 | Submit to Phantom Explore tab | Phantom Portal |

**Group size limit in beta:** Maximum 5 members, maximum 1 SOL payout — limits risk while validating the system.

---

## Phase 3 — Public Launch

> Goal: Open to all users, full feature set.

- [ ] Remove beta group size restrictions (up to 20 members)
- [ ] Open payout ranges: 0.5 SOL to 20 SOL
- [ ] PWA fully deployed — Android push notifications, partial iOS
- [ ] Phantom Explore listing live
- [ ] Referral system: share invite link, earn fee discount
- [ ] Landing page SEO optimisation
- [ ] Consider WhatsApp Business API integration (paid tier)
- [ ] WalletConnect Support (multi-wallet & mobile integration)
- [ ] Community support channel (Telegram group for users)

---

## Environment Variables

```bash
# .env (backend / Next.js API routes)

# Solana
SOLANA_NETWORK=devnet                         # or mainnet-beta
SOLANA_RPC_URL=https://rpc.helius.xyz/?api-key=xxx
PROGRAM_ID=YourAnchorProgramIDHere

# Platform
PLATFORM_WALLET=YourPlatformWalletAddress
PLATFORM_FEE_BPS=50                           # 0.5% = 50 basis points

# Notifications — Email
RESEND_API_KEY=re_xxxxxxxxxxxx

# Notifications — Telegram
TELEGRAM_BOT_TOKEN=1234567890:ABCDefghijk

# Notifications — PWA Push
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BxxxxxxxxxxxxxxX
VAPID_PRIVATE_KEY=xxxxxxxxxxxxxxxxxxxxxxxx

# Database
DATABASE_URL=postgresql://user:pass@host:5432/ajo

# App
NEXT_PUBLIC_APP_URL=https://ajo.app
```

---

## Deployment Commands

```bash
# Deploy Anchor program to Devnet
anchor build
anchor deploy --provider.cluster devnet

# Deploy to Mainnet
anchor deploy --provider.cluster mainnet-beta

# Deploy frontend (auto via Vercel GitHub integration)
git push origin main

# Run backend locally
npm run dev

# Run backend on Railway
# Connect Railway to GitHub repo — auto-deploys on push
```

---

*Next: [Security Considerations →](16-security.md)*
