# 08 — Notification System (4 Channels)

[← Back to README](../README.md) | [← Scenarios](07-scenarios.md)

---

## Overview

The notification system has **two tiers**:

| Tier | Channels | Status |
|------|---------|--------|
| **Always Active** | PWA Push + In-App Bell | On by default, no setup needed |
| **Optional** | Email + Telegram | User opts in, picks one or both |

---

## Channel Summary

| Channel | Status | Provider | Cost | User Setup |
|---------|--------|---------|------|-----------|
| 🔔 PWA Push Notification | **Active by default** | Web Push API (browser) | Free | Install app as PWA |
| 🔔 In-App Bell | **Active by default** | Built-in dashboard | Free | None — always on |
| 📧 Email | Optional (opt-in) | Resend.com | Free (3k/mo) | Enter email address |
| ✈️ Telegram | Optional (opt-in) | Telegram Bot API | Free (no limits) | Connect Telegram account |

---

## 8a — PWA Push Notification (Active by Default)

When a user installs `ajo.app` on their phone home screen as a Progressive Web App, browser push notifications are enabled automatically. No extra account or signup required.

| Aspect | Detail |
|--------|--------|
| How to enable | Visit `ajo.app` on mobile → tap "Add to Home Screen" → app installs as PWA |
| Android | Full push notification support on Chrome, Edge, Samsung Browser |
| iOS | Supported on iOS 16.4+ via Safari — user grants permission once |
| Delivered when | Even when the app is closed or the phone is locked |
| Provider | Web Push API — built into the browser, completely free |
| Dev setup | Service worker registration via `next-pwa` library (one-time) |

**Example notification:**
```
🔔 Ajo — Family Savings Group
Your 0.2 SOL contribution is due in 24 hours.
Tap to pay now before auto-pull from collateral.
```

---

## 8b — In-App Bell Notification (Active by Default)

Every time a member opens `ajo.app` they immediately see their notification bell with any pending alerts. Zero setup, works on every device and browser without exception.

| Aspect | Detail |
|--------|--------|
| Location | Dashboard header — bell icon with unread badge count |
| Content | Round reminders, auto-pull warnings, payout confirmations, cycle updates |
| Works on | All devices, all browsers, all wallets — no permissions needed |
| Storage | Off-chain server stores notification history per wallet address |
| Role | Catches everyone — even users who don't use PWA, Email, or Telegram |

---

## 8c — Email Notifications via Resend.com (Optional)

Users optionally provide their email during onboarding or in settings.

| Aspect | Detail |
|--------|--------|
| Provider | [Resend.com](https://resend.com) — modern transactional email API |
| Free tier | 3,000 emails per month |
| User setup | Enter email in profile settings → click verify link |
| Deliverability | High — dedicated sending infrastructure, good inbox rates |
| Integration | Node.js server → Resend REST API / SDK |
| Independent | Yes — works without Telegram. User can enable one or both. |

---

## 8d — Telegram Bot Notifications (Optional)

Users can link their Telegram account to receive notifications directly in their Telegram DM. Preferred by crypto-native users who live in Telegram.

| Aspect | Detail |
|--------|--------|
| Provider | Telegram Bot API — 100% free, no rate limits |
| User setup | Open Telegram bot → tap Start → enter link code in ajo.app settings |
| Delivery | Instant, reliable even on slow connections |
| Rich messages | Inline [Pay Now] button opens contribution page directly |
| Best for | Crypto-native users, Web3 community members |
| Independent | Yes — works without Email. User can enable one or both. |

**Telegram link flow:**
```
1. User taps "Connect Telegram" in ajo.app settings
2. App shows: "Open @AjoSavingsBot on Telegram"
3. User opens bot → taps Start
4. Bot sends a 6-digit code (expires in 10 minutes)
5. User enters code in ajo.app → accounts linked
6. All future notifications arrive in Telegram DM
```

---

## 8e — Notification Schedule

All active channels fire for each event:

| Trigger | Message | Channels |
|---------|---------|---------|
| Group full — cycle starting | "Your Ajo group is full. Round 1 starts on [date]" | All active |
| T-48hrs before round | "Contribution due in 2 days: [amount] SOL" | In-App + Email/Telegram if set |
| **T-24hrs (critical warning)** | **"Pay [amount] SOL in 24hrs or auto-pull from collateral"** | **ALL active channels** |
| Contribution confirmed | "Your [amount] SOL contribution for Round X confirmed" | In-App + PWA Push |
| Auto-pull executed | "[amount] SOL auto-pulled from collateral. Remaining: X SOL" | ALL active channels |
| Payout received | "[payout] SOL sent to your wallet from Round X!" | ALL active channels |
| Cycle complete | "Cycle complete. Your [collateral] SOL collateral refunded." | All active channels |

---

## 8f — User Preference Settings

```
NOTIFICATIONS

Always Active (no setup needed):
  🔔 In-App Bell        [ON — always]
  🔔 PWA Push           [ON when app installed]

Optional (pick one or both):
  📧 Email
     [your@email.com          ] [Verify]

  ✈️ Telegram
     [Connect Telegram Bot →  ]

  You can enable both Email and Telegram simultaneously.
```

| Channel | Default | User Action |
|---------|---------|------------|
| In-App Bell | ON — always | None |
| PWA Push | ON when PWA installed | Install app + grant permission |
| Email | OFF | Enter and verify email address |
| Telegram | OFF | Connect via bot link code |

---

## 8g — Technical Implementation

```
Off-chain Node.js server:

  Solana WebSocket (Helius)
    └── Listens for on-chain events (contributions, payouts, auto-pulls)
    └── Triggers instant notifications on confirmed events

  node-cron jobs
    └── T-48hrs: dispatch reminders
    └── T-24hrs: dispatch critical warnings

  Notification router
    ├── In-App Bell    → write to PostgreSQL notification table
    ├── PWA Push       → Web Push API (VAPID keys, service worker)
    ├── Email          → Resend.com REST API
    └── Telegram       → Telegram Bot API sendMessage
```

---

*Next: [Fee Structure →](09-fee-structure.md)*
