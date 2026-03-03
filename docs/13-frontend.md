# 13 — Frontend Design (Next.js 14 + PWA)

[← Back to README](../README.md) | [← Smart Contract](12-smart-contract.md)

---

## 13.1 Page Structure

| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing Page | App intro, how it works, connect wallet CTA, PWA install prompt |
| `/dashboard` | My Groups | All groups for the connected wallet. Notification bell with unread count. |
| `/create` | Create Group | Form: group name, member count, payout amount, interval. Shows auto-calculated collateral and contribution instantly. |
| `/join/[groupId]` | Join Group | Invite link destination. Shows group details, collateral required, join button. |
| `/group/[groupId]` | Group Dashboard | Live round status, countdown timer, member rotation list, vault inspector, collateral balances. |
| `/group/[groupId]/contribute` | Contribute | One-tap contribution page for current round. |
| `/settings` | Notification Settings | Enable/manage Email and Telegram. PWA install prompt. View In-App Bell history. |

---

## 13.2 Key UI Components

### Group Card
```
┌─────────────────────────────────────┐
│ 🏦 Family Savings Group             │
│ Round 3 of 10  ████████░░░░  30%    │
│                                     │
│ Next payout: Member C               │
│ ⏰ Contribution due in 2d 14h       │
│                                     │
│ Your contribution: 0.2 SOL          │
│ [Pay Now]                           │
└─────────────────────────────────────┘
```

### Create Group Form
```
Group Name:        [Family Savings 2026  ]
Number of Members: [10                  ]
Payout Amount:     [2                ] SOL

  ↓ Auto-calculated instantly:
  Contribution per member: 0.2 SOL / round
  Collateral required:     2 SOL (locked)
  Your rotation position:  #1 (first to pay)

Round Interval: ○ Weekly  ● Monthly

[Create Group — Pay 0.027 SOL setup fee]
```

### Member List
```
Rotation Order    Member          Collateral Status
─────────────────────────────────────────────────
#1  Member A      0xABC...     ████████████  Full
#2  Member B      0xDEF...     ████████████  Full
#3  Member C      0x123...     ████████░░░░  0.8 SOL
#4  Member D      0x456...     ████████████  Full
#5  Member E      0x789...     ████████████  Full
```

### Vault Inspector
```
Vault Balance:       5.0 SOL
├── Collateral pool: 4.8 SOL (4 full + 1 partial)
└── Current round:   0.6 SOL collected (3/5 paid)

Next payout: 1 SOL → Member C
```

### Notification Bell
```
🔔 3 unread

  ⚠️  Round 4 contribution due in 24 hours
      Pay 0.2 SOL to avoid auto-pull    2h ago

  ✅  Your R3 contribution confirmed
      0.2 SOL received                  3d ago

  💰  Payout received!
      1 SOL sent to your wallet         1w ago
```

---

## 13.3 Wallet Connection Setup

```typescript
// _app.tsx
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'

const wallets = [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter(),
  // add more as needed
]

<ConnectionProvider endpoint={heliusRpcUrl}>
  <WalletProvider wallets={wallets} autoConnect={true}>
    <WalletModalProvider>
      <App />
    </WalletModalProvider>
  </WalletProvider>
</ConnectionProvider>
```

---

## 13.4 PWA Configuration

```javascript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})

module.exports = withPWA({
  // Next.js config
})
```

```json
// public/manifest.json
{
  "name": "Ajo Savings",
  "short_name": "Ajo",
  "description": "Community savings on Solana",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#4A2A8A",
  "theme_color": "#6C3FC5",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

---

*Next: [Wallet Strategy →](14-wallet-strategy.md)*
