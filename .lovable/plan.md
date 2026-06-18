## Goal

Turn the QR module into a complete, ad-monetized "Smart Hub":

- **Poster sheet** redesigned pixel-close to screenshot #1 (shop photo background, QR over it, edit name, + center / share right / download left).
- **Public landing page** `/s/$code` rendered when anyone scans the poster — fully admin-controlled, with AdMob placeholders, verified merchant header, and a bottom-sheet action picker (Play Store / Payment / Digital Shop).
- **Merchant setup sheet** (the "+" on the poster) lets the shopkeeper toggle each channel on/off, paste their UPI / Shop URL, long-press to delete, and unlock extra links via a ₹599 Razorpay paywall.
- Fix the broken **download-to-gallery** path on mobile.

---

## 1. Database (one migration)

New table `public.merchant_link_settings` (one row per user):
- `play_store_enabled boolean default true`
- `payment_enabled boolean`, `payment_provider text` (`upi` / `phonepe` / `paytm` / `gpay`), `payment_upi_id text`, `payment_label text`
- `digital_shop_enabled boolean`, `digital_shop_url text`
- `extra_links jsonb` (array of `{id,label,url,icon,enabled}`) — gated by paywall
- `premium_unlocked boolean default false`, `premium_paid_at timestamptz`, `premium_payment_ref text`
- `poster_bg_url text` (the shop photo behind the QR)

New table `public.landing_page_settings` (admin singleton, id=1):
- `top_banner_url`, `top_banner_link`, `bottom_banner_url`, `bottom_banner_link`
- `admob_top_slot text`, `admob_bottom_slot text`, `admob_publisher_id text`
- `announcement_text`, `announcement_active boolean`
- `premium_link_fee_inr int default 599`

New RPCs:
- `get_public_landing(_code text)` → merchant card (name, avatar, shop, verified flag) + enabled links + landing settings. **SECURITY DEFINER**, exposed to `anon`.
- `upsert_merchant_link_settings(...)` — caller-scoped.
- `mark_premium_links_unlocked(_payment_ref text)` — flips `premium_unlocked=true`.
- Admin: `admin_update_landing_settings(...)`.

RLS:
- `merchant_link_settings`: owner full CRUD via `auth.uid()=user_id`; admin via `is_admin_user()`.
- `landing_page_settings`: SELECT to `anon` + `authenticated`; UPDATE admin-only.
- Public landing reads use the SECURITY DEFINER RPC (no broad anon table grants).

## 2. New / refactored files

**Refactored:**
- `src/components/QrPosterSheet.tsx` — drop the painted canvas; new layout matches screenshot #1: shop-photo background fills the top, QR (with gold-bordered Karo logo) sits over it, editable shop name pill, then the three pill buttons (Download | + | Share). Fix download by using a real anchor + `URL.createObjectURL` for `<img>` element rendered to a 1080×1920 offscreen canvas, then `cnv.toBlob` → blob URL → `<a download>` (the current code path works on desktop but fails on Android WebView; switch to `<a target="_blank" rel="noopener">` fallback + share-with-file when blob download is blocked).

**New:**
- `src/components/MerchantLinksSetupSheet.tsx` — opens from the "+" button. Play Store row (always on), Payment row (toggle + provider dropdown + UPI input), Digital Shop row (toggle + URL input). Long-press to delete extra rows. Bottom "+" tile: if `premium_unlocked` → open inline new-link editor, else trigger Razorpay ₹599 flow.
- `src/routes/s.$code.tsx` — public landing page. Layout:
  1. AdMob top slot (responsive 320×100 placeholder, swappable with real `<ins class="adsbygoogle">` once admin sets publisher ID)
  2. Merchant profile card (avatar, name, shop, verified gold tick)
  3. Admin announcement strip (if active)
  4. Admin top banner (clickable)
  5. Bottom sheet animated up on mount with the enabled action buttons
  6. AdMob bottom slot
- `src/lib/premium-links.functions.ts` — Razorpay order + verify for ₹599 unlock (mirrors influencer activation pattern).
- `src/components/AdSlot.tsx` — renders Google AdSense `<ins>` when publisher+slot configured, otherwise a tasteful "Advertise here" skeleton.

**Edited:**
- `src/routes/referral.tsx` — wire poster "+" → `MerchantLinksSetupSheet`; load merchant settings via new hook.
- `src/routes/admin.referrals.tsx` — new "Landing Page" tab: top/bottom banner URLs, announcement, AdSense publisher ID + slot IDs, premium link fee.
- `src/routeTree.gen.ts` — register `/s/$code`.

## 3. Payment routing (Button 2)

UPI deep link format used: `upi://pay?pa=<vpa>&pn=<merchant>&cu=INR`. This is what triggers the merchant Sound Box (PhonePe Smart Speaker, Paytm Soundbox) because the transaction lands on the merchant's VPA exactly the same way a static QR scan would. On desktop the same link falls back to a "Open in UPI app" prompt; we also expose `phonepe://`, `paytmmp://`, `tez://` provider-specific intents when the merchant picked a specific provider.

## 4. Download fix

Root cause of "gallery download not working": `cnv.toBlob` runs but on Android Chrome the synthetic `<a download>` click is blocked when the anchor isn't in the DOM long enough, and WebView blocks `blob:` downloads entirely. Fix:
- Always append the `<a>` to `document.body`, wait one frame (`requestAnimationFrame`), then click and remove.
- If `navigator.userAgent` indicates Android WebView, fall back to opening the blob URL in a new tab with a toast asking the user to long-press → "Save image".
- Add `Web Share Level 2` files share as the primary "Save" path on mobile (most reliable route into the gallery).

## 5. Verification

- `psql` confirms new tables + RPC grants.
- Build runs clean (`tsc --noEmit` step via the harness).
- Manual: open `/s/<my-code>` in an incognito tab, toggle each channel off in the setup sheet, refresh — disabled buttons disappear.

## 6. Hindi summary

After implementation I will write a full Hindi recap of what shipped, what was deferred, and exactly how the download-fix behaves on Android.

---

**Open question before I start:** the ₹599 unlock — should it be a **one-time payment** that permanently unlocks unlimited extra links (simpler, matches the influencer activation model), or a **per-link micro-charge** every time the merchant adds another link? My plan above assumes one-time. Confirm and I'll execute the whole batch.