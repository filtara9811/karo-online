# Referral Floating Button — Everywhere, Context-Aware, Deep-Linked

A single premium floating "Refer & Earn" button appears on every app surface (Quick Service home, One QR dashboard, Vendor panel, Digital Shop / landing dashboards). It sits on the right side, slightly above the existing dock, with a 3D gold/orange look and a soft pulse. Tapping it opens a compact share sheet; the wallet total and pending count show on the button as a badge.

## Context-aware link (the important part)

The button shares a different link depending on where the user is, but the reward always goes to the person sharing:

- Quick Service / customer home → the user's own referral link: `/r/<MY-CODE>`
- One QR / Digital business dashboard → the merchant's own QR landing link with referral attribution: `/s/<merchant-code>?ref=<MY-CODE>`
- Vendor panel → vendor referral link (`/r/<MY-CODE>` with vendor kind) so vendor-side rewards apply
- Digital shop / storefront screens → shop link `/s/<shop-code>?ref=<MY-CODE>`

Whoever opens the link is attributed to the sharer's wallet, and joining, scanning, or ordering from that link credits the same wallet as today.

## Button behaviour

- Right-side floating pill/orb, safe-area aware, never overlaps the orange dock or bottom sheets; auto-hides while a full-screen sheet, chat, or landing page is open.
- Per-surface label and colour accent: "Refer & Earn" (customer), "Refer a shop" (vendor), "Share my QR" (One QR / shop).
- Tap → share sheet with: preview of the link, native Share, WhatsApp share, Copy link, QR image, and "Open referral dashboard".
- Long-press → instant copy of the link.

## Deep linking

- Links keep working for web and app: opening `/r/<code>` stores the pending code (existing behaviour) and continues to the Play Store with a referrer for fresh installs, so attribution survives install.
- `/s/<shop-code>?ref=<code>` stores the referral code first, then shows the merchant landing page as normal, so both the shop visit and the referral get tracked.
- All share text uses the current site origin, so preview/production/custom domain each share their own valid URL.

## Technical notes

- New `src/components/referral/ReferralFloatingButton.tsx` (surface-aware presentation + 3D styling) and `ReferralShareSheet.tsx` (link preview, native share, WhatsApp, copy, QR).
- Surface detection from the route via a small `useReferralContext()` hook: reads `location.pathname` + `getVariantConfig()` and returns `{ kind, label, accent, buildLink() }`.
- Code comes from the existing `useReferralOverview()` / `ensureMyCode44()` hooks; merchant/shop code from data already loaded on those screens (One QR project code, landing `code` param) — no new backend calls beyond what exists.
- Mounted once in `src/components/AppShell.tsx` next to `FloatingDockNav`, using a new `showReferralFab` rule (all app routes, excluding marketing pages, `/r/`, `/s/`, `/c/`, admin/staff, and chat/full-screen flows). No change to `showFloatingDock`.
- `src/routes/s.$code.tsx` gains `?ref=` capture (writes `REFERRAL_PENDING_KEY`, same as `/r/$code`) so shop-shared links attribute correctly.
- Sharing reuses `shareLink()` from `src/lib/share.ts`; no schema or RLS changes and no changes to reward payout logic.
