# 11 — Architecture Overview

[← Back to README](../README.md) | [← Tech Stack](10-tech-stack.md)

---

## 11.1 System Layers

The application is split into three distinct layers:

```
┌─────────────────────────────────────────────────────────────┐
│                    CHAIN LAYER (Solana)                      │
│                                                             │
│   Anchor Program (Rust)  │  PDA Vault Account               │
│   ─────────────────────────────────────────────────         │
│   Holds all funds, executes payouts, auto-pulls              │
│   collateral, enforces all business rules on-chain           │
└─────────────────────────────────────────────────────────────┘
                              ↕ RPC / WebSocket
┌─────────────────────────────────────────────────────────────┐
│               APP LAYER (Next.js 14 + PWA)                  │
│                                                             │
│   React UI  │  Wallet Adapter  │  Anchor SDK Client          │
│   Service Worker  │  API Routes                             │
│   ─────────────────────────────────────────────────         │
│   User interface, wallet connection, transaction             │
│   building, group dashboard, PWA push notifications          │
└─────────────────────────────────────────────────────────────┘
                              ↕ REST / WebSocket
┌─────────────────────────────────────────────────────────────┐
│               SERVICE LAYER (Node.js)                       │
│                                                             │
│   Cron Jobs  │  Notification Engine  │  Solana WebSocket    │
│   PostgreSQL  │  Resend  │  Telegram Bot API                │
│   ─────────────────────────────────────────────────         │
│   24hr warnings, round reminders, on-chain event            │
│   monitoring, off-chain state tracking for all 4 channels   │
└─────────────────────────────────────────────────────────────┘
```

---

## 11.2 Data Flow

```
1.  User connects Phantom wallet to ajo.app
    (browser or Phantom in-app browser)

2.  Frontend reads group state from Solana via Helius RPC

3.  User signs transaction
    (contribute / create group / join group / etc.)

4.  Transaction sent to Solana
    → Anchor program validates and executes on-chain
    → Vault balance updated

5.  Off-chain server monitors Solana events
    via Helius WebSocket subscription

6.  Cron jobs fire at T-48hrs and T-24hrs
    → Dispatches reminders to all active channels
       (PWA Push, In-App Bell, Email, Telegram)

7.  At grace period end (T+24hrs)
    → Server calls auto_pull instruction
    → Contract pulls contribution from defaulter's collateral
    → Pool made whole

8.  Server calls execute_payout instruction
    → Payout sent to round recipient minus 0.5% fee
    → Confirmation notification sent via all active channels

9.  After final round
    → Server calls refund_collateral instruction
    → Each member's remaining collateral returned to their wallet
    → Cycle complete notification sent
```

---

## 11.3 Database Schema (Off-Chain)

```sql
-- Mirrors on-chain group state for fast UI queries
groups (
  group_id        VARCHAR PRIMARY KEY,  -- on-chain PDA address
  name            VARCHAR,
  payout_amount   DECIMAL,
  member_count    INT,
  round_interval  VARCHAR,              -- 'weekly' | 'monthly'
  current_round   INT,
  status          VARCHAR,              -- 'filling' | 'active' | 'completed'
  created_at      TIMESTAMP
)

-- Member notification preferences
members (
  wallet_address  VARCHAR PRIMARY KEY,
  group_id        VARCHAR,
  email           VARCHAR,              -- null if not opted in
  telegram_chat_id BIGINT,             -- null if not opted in
  pwa_endpoint    TEXT,                -- null if PWA not installed
  rotation_position INT,
  joined_at       TIMESTAMP
)

-- Notification history (powers in-app bell)
notifications (
  id              SERIAL PRIMARY KEY,
  wallet_address  VARCHAR,
  group_id        VARCHAR,
  type            VARCHAR,             -- 'reminder' | 'warning' | 'autopull' | 'payout' | 'refund'
  message         TEXT,
  read            BOOLEAN DEFAULT false,
  created_at      TIMESTAMP
)
```

---

## 11.4 Wallet Connection Flow

```
Standard browser (Chrome/Safari):
  ajo.app → "Connect Wallet" button
  → @solana/wallet-adapter modal opens
  → User picks Phantom / Solflare / Backpack
  → autoConnect: true saves preference
  → Returns automatically on next visit

Phantom in-app browser:
  Phantom app → browser tab → ajo.app
  → window.solana already injected by Phantom
  → Wallet auto-connected, no button click needed
  → Seamless mini-app experience
```

---

*Next: [Smart Contract Design →](12-smart-contract.md)*
