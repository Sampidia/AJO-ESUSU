# 14 — Wallet Strategy

[← Back to README](../README.md) | [← Frontend](13-frontend.md)

---

## 14.1 Dual Access Model

The app is built as a **standalone web dApp (Option 1)** that automatically becomes a **wallet mini app (Option 3)** when accessed inside Phantom's browser. One codebase, two access points — no extra development required.

| Access Point | Experience | Wallet Connection |
|-------------|-----------|-----------------|
| `ajo.app` in Chrome/Safari | Full web app, all features, PWA installable | Connect Wallet button + `autoConnect` |
| `ajo.app` in Phantom browser | Mini-app feel, wallet pre-connected | Auto-injected by Phantom |
| Phantom Explore listing | Discoverable by 15M+ Phantom users | Auto-injected by Phantom |
| WhatsApp/Telegram invite link | Direct join flow via URL | Connect wallet on landing |

---

## 14.2 Why This Works

When a user visits any website inside Phantom's in-app browser, Phantom automatically injects `window.solana` into the page's JavaScript context. This means:

```javascript
// On a normal browser, this shows a connect button
// Inside Phantom's browser, window.solana is already available
// and the wallet is already connected — no button needed

if (window.solana?.isPhantom) {
  // Already inside Phantom browser
  // Wallet auto-connected, skip connect modal
}
```

The `@solana/wallet-adapter` handles this detection automatically.

---

## 14.3 autoConnect

```typescript
// Wallet adapter configured with autoConnect: true
<WalletProvider wallets={wallets} autoConnect={true}>
```

**What this means for returning users:**

```
Monday (first visit):
  Open Chrome → ajo.app → Connect Wallet → approve in Phantom ✅
  localStorage saves: { wallet: "Phantom" }

Next Monday (return visit):
  Open Chrome → ajo.app
  → autoConnect silently reads localStorage
  → Reconnects to Phantom in background
  → User sees dashboard already loaded ✅
  → Pays contribution ✅
```

---

## 14.4 Mobile Invite Link Flow

When a member receives a group invite link in WhatsApp or Telegram:

```
Member taps: ajo.app/join/group123abc

  ↓ Opens in mobile browser (Safari/Chrome)

Page loads with smart banner:
  ┌──────────────────────────────────┐
  │ 📱 For best experience           │
  │ Open in Phantom for 1-tap join   │
  │                                  │
  │ [Open in Phantom] [Continue here]│
  └──────────────────────────────────┘

If "Open in Phantom" tapped:
  → Opens Phantom app
  → Navigates to: phantom.app/ul/browse/ajo.app/join/group123abc
  → Wallet already connected
  → Member sees join page immediately
  → Deposits collateral in one tap ✅
```

**Deep link URL format:**
```
https://phantom.app/ul/browse/https%3A%2F%2Fajo.app%2Fjoin%2F[groupId]
```

---

## 14.5 Supported Wallets

The `@solana/wallet-adapter` supports all major Solana wallets out of the box:

| Wallet | Desktop | Mobile |
|--------|---------|--------|
| Phantom | ✅ Browser extension | ✅ In-app browser |
| Solflare | ✅ Browser extension | ✅ In-app browser |
| Backpack | ✅ Browser extension | ✅ In-app browser |
| Coinbase Wallet | ✅ Browser extension | ✅ Mobile app |
| Ledger | ✅ Hardware wallet | ❌ |

---

## 14.6 Phantom Explore Submission

To be listed inside Phantom's "Explore" tab (15M+ users):

1. Build and deploy `ajo.app` (Vercel)
2. Ensure the app works correctly inside Phantom's in-app browser
3. Submit to Phantom Portal: [phantom.app/submit](https://phantom.app/submit)
4. Phantom reviews the app (1–2 weeks)
5. App appears in Explore tab under "DeFi" or "Finance" category

This gives access to Phantom's entire existing user base with zero marketing spend.

---

*Next: [Deployment Plan →](15-deployment.md)*
