# 16 — Security Considerations

[← Back to README](../README.md) | [← Deployment](15-deployment.md)

---

## 16.1 Smart Contract Security

| Risk | Mitigation |
|------|-----------|
| Vault drained by malicious actor | All SOL held in PDA — no private key controls it. Only the program can authorize transfers. |
| Wrong contribution amount sent | Amounts validated on-chain against stored `GroupState.contribution_amount` on every call. |
| Payout triggered too early | `execute_payout` checks that all contributions are settled AND grace period has passed. |
| Admin changes rotation order | Rotation list is stored on-chain and is immutable after cycle starts. |
| Parameters changed mid-cycle | `payout_amount`, `member_count`, `collateral_amount`, and `interval` are frozen after the first member joins. |
| Re-entrancy attacks | Mitigated by Solana's single-threaded, sequential instruction execution model. |
| Signer spoofing | Every member-specific instruction verifies `ctx.accounts.member.key() == expected_wallet`. |

---

## 16.2 Frontend Security

| Risk | Mitigation |
|------|-----------|
| Frontend steals funds | All transaction logic is verified and executed by the smart contract. The frontend only builds and submits unsigned transactions. |
| Man-in-the-middle attack | HTTPS enforced on Vercel for all traffic. |
| Private key exposure | Wallet adapter never accesses private keys — only requests user signature in their wallet app. |
| Invite link guessing | Group invite links use non-guessable UUIDs generated server-side. |
| Phishing (fake ajo.app) | Users should verify the URL. Future: ENS or Solana naming service domain verification. |

---

## 16.3 Notification Security

| Risk | Mitigation |
|------|-----------|
| Email account hijacked by another wallet | Email is tied to a wallet address in the DB. Changing it requires a signed message from the original wallet. |
| Telegram bot link code stolen | Link codes are single-use and expire after 10 minutes. |
| PWA push subscription hijacked | Subscriptions stored server-side tied to the wallet pubkey. |
| Spam notifications | Rate-limited per wallet address — max 10 notifications per hour per member. |

---

## 16.4 Known Limitations

### SOL Price Volatility
The system uses SOL amounts, not USD. A 2 SOL payout group started when SOL = $50 behaves very differently than when SOL = $200. Members should be aware of this when choosing payout amounts.

### Notification Server Downtime
Notifications are off-chain. If the Node.js server goes down, push/email/telegram warnings may not be sent. However:
- **The smart contract still executes correctly** — auto-pull and payout happen on-chain regardless
- The In-App Bell shows missed notifications when the user opens the app
- The server going down does not affect funds at any point

### iOS PWA Push Notifications
Requires iOS 16.4+ and Safari. Users on older iOS versions or Android browsers that don't support Web Push receive notifications only via the In-App Bell and their optional Email/Telegram channels.

### Single Default Coverage
The collateral exactly covers one member's full contribution liability. It does **not** cover multiple members' defaults simultaneously from the same pool — each member's collateral is separate and individual.

---

## 16.5 Upgrade Path

The initial contract is **non-upgradeable** for maximum trust — users can verify the program is exactly what was audited.

Future upgrades will use:
1. **Anchor's upgradeable BPF loader** — allows program updates via multisig
2. **Community governance timelock** — any upgrade proposal must wait 7 days before execution
3. **Migration script** — existing groups complete their cycle on the old program; new groups use the updated program

---

## 16.6 Audit Checklist (Pre-Mainnet)

- [ ] All instructions tested with malformed inputs
- [ ] Collateral math verified for edge cases (2 members, 20 members)
- [ ] PDA derivation verified — no seed collisions
- [ ] Overflow checks on all lamport arithmetic (use `checked_add`, `checked_sub`)
- [ ] Grace period timestamp validation tested
- [ ] Platform fee calculation tested at boundary values
- [ ] Community peer review completed
- [ ] Consider professional audit for mainnet with real SOL

---

*← [Back to README](../README.md)*
