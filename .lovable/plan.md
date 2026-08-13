# Shopper Landing Page — Drawer, Chat Orders, and a Clean Video-First Layout

Covers the new side drawer + GMB, real in-app chat and order requests, and the performance/audio/layout clean-up on `/s/{code}`.

## 1. Top-left shop icon + side drawer

- Replace the round avatar with a shop icon button (merchant logo shown inside a subtle shop-shaped chip).
- Tap opens a professional left side drawer (Quick Service style: header with shop name/logo, clean rows, safe-area padding).
- Drawer rows:
  - **My Orders** — the shopper's own inquiries and order requests on this shop, each opening its chat.
  - **My Profile** — edit saved name and mobile (the details captured at scan), stored on the device and synced to the shop record.
  - **Support** — three separate icon buttons: WhatsApp, Call, Email, all pre-linked to the merchant's saved contact details (hidden individually when the merchant has not provided that channel).
  - Existing extras (install app, share, copy link) move into the drawer footer so the "⋮" menu no longer duplicates them.

## 2. Top-right GMB

- Google Business icon sits immediately left of the three-dots menu and opens the merchant's GMB link in a new tab. Rendered only when a Google/Maps link is saved.

## 3. Product sheet → chat and orders

- Tapping any product card opens the full-screen Product Detail Sheet (image fully visible, price/MRP, stock, rating, description).
- Two large bottom buttons: **Inquiry** and **Order**.
  - **Inquiry** opens a real in-app chat thread with the merchant for that product, with the first message pre-filled.
  - **Order** places an order request (product, quantity, shopper name/phone), then drops the shopper into the same chat thread with an order card as the first message. No payment.
- Chat is a full-height sheet: merchant header, message bubbles, live updates, and a composer. Merchant replies appear here.
- The merchant reads and replies from the One QR dashboard's visitor/inbox area, so every shop conversation lands in one place.

## 4. Layout clean-up (video first)

- **Tag Karo**: much smaller, semi-transparent, right-aligned pill instead of a full-width white bar.
- **Stats bar** (Views / Shares / Products / Inquiries): thin, dark translucent glass so the video shows through.
- **Product cards**: compact size matching the "My Shop" dock tiles, so 3 cards fit on screen without covering the model.
- Vertical spacing rebalanced so the stats row, product rail, and bottom dock never overlap each other or the dock.
- **Sponsored shops rail removed** from the shopper landing page entirely (the two long cards below the fold).

## 5. Bugs

- **Lag on taps/scroll**: stop the always-running animation loops (product-rail auto-drift and the image progress sweep) when the page is not visible or the user is interacting, drop the expensive full-screen blurred backdrop behind the video, and lighten the swipe transition. Product images use the small tile size.
- **Random background noise**: caused by the outgoing video staying mounted and audible during the cross-fade. The previous frame will be muted and paused the moment a swipe starts, and only the active video keeps audio, so no overlapping sound.

## Technical notes

- New tables: `shop_threads` (merchant code, product ref, visitor token, name/phone, kind = inquiry/order, quantity, status) and `shop_thread_messages` (thread, sender = shopper/merchant, body, created_at). RLS on both; no direct anon table access.
- Shopper access goes through `SECURITY DEFINER` RPCs keyed by a device-local visitor token: `shop_thread_start`, `shop_thread_send`, `shop_thread_list`, `shop_thread_messages`. Merchant access is scoped to the owner of the QR code / merchant record. GRANTs issued per role in the same migration.
- New components: `LandingShopDrawer.tsx` (drawer + My Orders / My Profile / Support), `LandingChatSheet.tsx` (thread view + composer), `landing-visitor.ts` (device token + saved name/phone helpers).
- `LandingProductSheet.tsx` gains Inquiry/Order actions and a quantity stepper; `LandingProductRail.tsx` switches to compact cards; `LandingStatsBar.tsx` becomes a thin translucent bar with a small right-aligned Tag pill.
- `LandingTopBar.tsx`: shop-icon trigger, GMB button placement.
- `s.$code.tsx`: drop the ads rail, wire the drawer/chat sheets, re-tier the bottom stack offsets.
- `LandingStoryMedia.tsx`: mute+pause the exiting frame, remove the blur-2xl backdrop layer, pause rAF loops on `visibilitychange`.
- Merchant inbox: extend the One QR visitor/chat sheet to list shop threads and send replies.
