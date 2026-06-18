# Premium Refer & Earn — Final Push

Scope is broad (8 feature areas, ~6 files touched, 1 SQL migration, 2 new components). To keep the build green I'll ship in 3 phases. Each phase ends with the app compile-clean and the previous phase still working.

## Phase 1 — Engine & Audio (foundation)

**SQL migration `referral_engine_v3.sql`**
- Rewrite `release_referral_reward(_vendor_user_id)`:
  - Resolve L1 referrer + L2 referrer (frozen lineage on `referrals`).
  - Read `referral_settings`: `is_active`, `base_reward_amount`, `level_1_pct`, `level_2_pct`, `royalty_tiers` (JSONB), `freeze_new_only` flag.
  - **Campaign paused rule**: If `is_active = false`, still release rewards for `referrals` rows created BEFORE `paused_at`; block only brand-new chains.
  - **Royalty bonus**: Count referrer's `direct_recruits` (status in approved/locked). Find highest `min_recruits` tier ≤ that count. Add `base * bonus_pct / 100` to the L1 row only (write to `referral_rewards` with `level=1`, `pct_applied=level_1_pct + bonus_pct`).
- Add `referral_settings.paused_at TIMESTAMPTZ`; auto-update via trigger on `is_active` flip.
- Add `influencer_activation_fee NUMERIC DEFAULT 499`.
- Add `vendors.partner_kind TEXT DEFAULT 'vendor'` (vendor | influencer) for the new track.

**Audio upgrade — `src/lib/coin-sound.ts`**
- Replace `playCoinDrop` body with synthesized **cash-register cha-ching**: bell ding (G6→C7→E7 chord stack) + drawer-slide noise burst + low ka-chunk thunk, all via Web Audio. No asset weight.

## Phase 2 — Sidebar Referral Strip (both panels)

**New component `src/components/ReferralStrip.tsx`**
- Horizontal pill: left = ivory `Rs, {wallet.total}` typography, right = glowing gold-bordered "[👥 Referral]" button with red notification dot when pending count > 0.
- Whole strip is a `<Link to="/referral">` (vendors → `/referral` too; the route already detects kind).
- Reads `useReferralOverview()` for live total.

**Mount points**
- `src/components/ProfileSheet.tsx` — directly under the personal card.
- `src/components/VendorSideMenu.tsx` — directly under the vendor business card.

## Phase 3 — Referral Dashboard Polish + QR Poster + Withdraw Gate

**`src/routes/referral.tsx`**
- Header: keep admin-configured `BannerCarousel`-style auto-sliding hero (uses `referral_settings.banner_image_url` array — if only one image, no slide).
- Dual share bar under the 4+4 code:
  - Left: emerald-green pill `[🔲 Share QR]` → opens new `QrPosterSheet`.
  - Right: existing matte-gold `[🔗 Share]` (native share / WhatsApp Play Store deep link, unchanged).
- **Merge ProgressSheet + downline** into one scrolling sheet: top = referee header, then 3-task timeline, then "Team" downline list with status pills. Remove the separate back-face flip — both surfaces consolidated.

**New component `src/components/QrPosterSheet.tsx`** (Drawer, client-only)
- Top: editable name field (defaults to user's display name, dynamic in QR caption).
- Image attach: `<input type="file" accept="image/*">` → cropped/centred logo overlaid on the QR center hole.
- Mid: QR rendered via `qrcode` npm package onto an offscreen `<canvas>`, encoding the Play Store deep link with `?referrer=ASHU8380`.
- Footer: `[📥 Download QR]` exports the entire poster canvas as 1200×1600 PNG via `canvas.toBlob()` + anchor download. `[💬 Share | QR]` uses `navigator.share({ files: [pngFile] })` with text fallback.

**New `src/components/WithdrawGateSheet.tsx`** (replaces simple withdraw button on referral wallet)
- Step 1 — KYC & Bank: PAN, account number, IFSC inputs → upserts `kyc_verifications` row.
- Step 2 — Activation gate:
  - If `vendors.payment_completed = true` (vendor) OR `vendors.partner_kind='influencer' AND payment_completed=true` → green tick, withdrawal unlocked.
  - Otherwise: pending clock + two CTAs:
    1. "Join as Professional Vendor" → `/vendor/register` (existing trade wizard + ₹1000 activation).
    2. "Join as Digital Influencer / Part-Time Partner" → new lightweight Razorpay checkout for `influencer_activation_fee` (₹499). On success, upserts `vendors` row with `partner_kind='influencer'`, `payment_completed=true`.

**Admin (`src/routes/admin.referrals.tsx`)** — Engine tab
- Add `influencer_activation_fee` numeric input.
- Add banner multi-image manager (array of URLs).
- Verify existing royalty tiers UI saves correctly to JSONB after schema change.

## Files Created
- `src/components/ReferralStrip.tsx`
- `src/components/QrPosterSheet.tsx`
- `src/components/WithdrawGateSheet.tsx`
- `supabase/migrations/<ts>_referral_engine_v3.sql`

## Files Edited
- `src/components/ProfileSheet.tsx`, `src/components/VendorSideMenu.tsx` (mount strip)
- `src/routes/referral.tsx` (header carousel, dual share bar, merged sheet, wire WithdrawGateSheet)
- `src/routes/admin.referrals.tsx` (influencer fee + banner array)
- `src/hooks/use-referral.ts` (extend types: `paused_at`, `influencer_activation_fee`, banner array)
- `src/lib/coin-sound.ts` (cha-ching synth)
- `package.json` (`qrcode` + `@types/qrcode`)

## Dependencies to install
- `qrcode` (≈30 KB, pure JS, Worker-safe — client only here)

## Verification
- After each phase: `tsc --noEmit` runs via harness build.
- Phase 3: Playwright on `/referral` to confirm sheet renders, QR downloads, withdraw gate steps advance.

Confirm and I'll execute Phase 1 (migration + audio) first, then Phase 2, then Phase 3 in sequence.