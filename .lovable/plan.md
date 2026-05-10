# Referral & Rewards System — Extension Plan

This is an **extension-only** build. No existing pages, components, wallet logic, dashboards, sidebars, or themes will be modified. All new work lives in new files and is linked from existing entry points via small, additive insertions only.

---

## 1. Database (new tables only — no existing tables touched)

New migration adds:

- **`referral_codes`** — one row per user (customer/vendor). Fields: `user_id`, `code` (unique, e.g. `REF-AS9811`), `kind` ('customer' | 'vendor'), `created_at`.
- **`referrals`** — tracks each referred signup. Fields: `referrer_user_id`, `referred_user_id`, `referred_phone`, `kind`, `status` ('pending' | 'approved' | 'rejected' | 'locked'), `device_fingerprint`, `ip_address`, `created_at`, `updated_at`.
- **`referral_progress`** — per-referral journey checkpoints. Boolean fields: `installed`, `registered`, `otp_verified`, `kyc_completed`, `became_seller`, `first_order_placed`, `payment_completed`, `reward_released`, plus timestamps for each.
- **`referral_rewards`** — ledger of reward events. Fields: `referral_id`, `user_id` (recipient), `amount`, `currency`, `trigger` (which checkpoint released it), `status` ('pending' | 'locked' | 'approved' | 'rejected'), `released_at`, `notes`.
- **`referral_campaigns`** — admin-controlled campaign config. Fields: `name`, `kind` ('customer' | 'vendor'), `is_active`, `reward_amount`, `release_trigger` (e.g. `first_order_placed`), `min_order_value`, `max_per_user`, `starts_at`, `ends_at`.
- **`referral_settings`** — single-row table for global rules (fraud thresholds, default reward, T&C text).

**RLS** on all tables: users see only their own rows; admins (existing `user_roles` check) see everything. A `has_role()`-style policy is reused.

A trigger auto-creates a `referral_codes` row when a customer or vendor profile is created.

## 2. Wallet integration (additive)

The existing wallet system is **not changed**. A new view/RPC `wallet_referral_summary(user_id)` aggregates `referral_rewards` by status and surfaces:
- Pending rewards
- Locked rewards
- Approved (claimable / credited) rewards
- Rejected rewards

Approved rewards post into the existing wallet via the existing wallet insert path (whatever function the current wallet uses) — invoked from a server function, not by editing the wallet UI.

## 3. New routes (no existing routes edited except 1-line link insertions)

- `src/routes/referral.tsx` — Customer "Invite & Earn" page. Top: banner + code + Copy + WhatsApp + Share. Middle: 4 stat tiles (Total earnings, Pending, Successful referrals, Total invited). List of progress cards per referred user with the 8-step journey. Bottom: T&C + rules accordion.
- `src/routes/r.$code.tsx` — Public landing page for `/r/REF-XXXX` deep links. Captures code into localStorage + cookie, then redirects to `/register`.
- `src/routes/vendor.referral.tsx` — Vendor invite page (vendor-styled, same component skeleton).
- `src/routes/admin.referrals.tsx` — Admin control panel: Campaigns tab, Rewards approval queue, Fraud reports, Analytics (top referrers, funnel, payouts, growth chart), Settings.

All new pages reuse existing tokens (`#d4af37` gold, `font-display`, `GoldCard`, existing card/button classes) so they look native.

## 4. Server functions (`src/lib/referral.functions.ts`)

- `getMyReferralOverview` — code, stats, list of referrals with progress.
- `applyReferralCode({ code })` — called during registration if a code is stored; creates `referrals` row + initial `referral_progress`.
- `markReferralCheckpoint({ referredUserId, checkpoint })` — called by existing flows (registration completed, KYC approved, first order paid) via small hooks. Idempotent.
- `releaseEligibleRewards()` — evaluates active campaigns + progress and inserts `referral_rewards` with the right status.
- Admin-only: `listReferralsAdmin`, `approveReward`, `rejectReward`, `upsertCampaign`, `getReferralAnalytics`.

## 5. Fraud controls

Inside `applyReferralCode` and `markReferralCheckpoint`:
- Reject self-referral (same `user_id`).
- Capture device fingerprint (simple hash of UA + screen + tz from client) and IP (from request headers in server fn).
- Flag duplicates: if same fingerprint or IP appears > N times for one referrer within 24h → mark referral `locked` for admin review.
- OTP-verified gate before any reward becomes eligible.

## 6. Hook points into existing flows (minimal, additive)

These are the **only** edits to existing files — each is a single function call insertion, no UI/logic rewrite:

- `RegistrationFlow.tsx` — after successful signup, read stored ref code from localStorage and call `applyReferralCode`. Then call `markReferralCheckpoint('registered')` and `'otp_verified'`.
- KYC approval path (existing) — call `markReferralCheckpoint('kyc_completed')`.
- First successful order path (existing orders store/server fn) — call `'first_order_placed'` + `'payment_completed'`.
- Vendor approval path — call `'became_seller'`.

If a hook point isn't easily reachable without refactor, we add a tiny wrapper rather than modifying existing logic.

## 7. Menu / Programs entry (the screenshot ask)

In the existing **Programs** screen inside the menu bar, add a new banner card "Invite & Earn — Referral Program" styled to match the existing Made-in-Family banners. Tapping it routes to `/referral`. This is a single additive card — surrounding banners untouched.

## 8. Sharing

- WhatsApp: `https://wa.me/?text=...` deep link with referral URL.
- Native share: `navigator.share` fallback.
- Copy code: `navigator.clipboard`.
- Share link format: `https://karoonline.in/r/REF-XXXX`.

(Firebase Dynamic Links is deprecated by Google as of Aug 2025 — using our own `/r/:code` route is the recommended replacement and works for both web and PWA installs. FCM/Analytics are out of scope for this turn unless you ask separately.)

## 9. Out of scope (intentionally not included)

- Native FCM push delivery wiring
- Any change to existing wallet UI / dashboard / sidebar
- Changes to existing color tokens or fonts

---

## File summary

**New files:**
- `supabase/migrations/<ts>_referral_system.sql`
- `src/lib/referral.functions.ts`
- `src/lib/referral-fraud.ts`
- `src/hooks/use-referral.ts`
- `src/components/referral/ReferralHeroCard.tsx`
- `src/components/referral/ReferralProgressCard.tsx`
- `src/components/referral/ReferralStatsRow.tsx`
- `src/components/referral/ReferralRulesSheet.tsx`
- `src/components/referral/ProgramsReferralBanner.tsx` (the Programs-page banner)
- `src/components/admin/ReferralCampaignEditor.tsx`
- `src/routes/referral.tsx`
- `src/routes/r.$code.tsx`
- `src/routes/vendor.referral.tsx`
- `src/routes/admin.referrals.tsx`

**Edited (additive only, ≤5 lines each):**
- Programs menu screen → insert `<ProgramsReferralBanner />`
- `RegistrationFlow.tsx` → call `applyReferralCode` + checkpoints
- KYC approve path → checkpoint call
- Order paid path → checkpoint call
- Vendor approve path → checkpoint call
- Admin sidebar → one new link to `/admin/referrals`

Approve and I'll ship it in one go (migration first, then code).
