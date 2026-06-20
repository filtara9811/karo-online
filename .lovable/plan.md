# Plan: KYC Flow + Referral Dashboard + Admin Control

## 1. KYC Flow Fixes (`src/components/KycStepFlow.tsx`)

**Selfie auto-advance**
- After successful upload + save of selfie URL, auto-jump to Aadhaar step (no manual "Next").
- Show ✓ green tick overlay on the captured selfie for 600ms before sliding.

**Form stability (PAN + Bank)**
- Replace controlled inputs that re-render entire flow on every keystroke with locally-memoised `useRef`-backed input state, or move PAN/Bank inputs into separate sub-components with their own `useState` so parent re-renders don't blur the field.
- Stop calling `supabase` save on every change — only persist on field blur or on "Save & Continue".

**Stepper tick indicators**
- Top stepper (Selfie | Aadhaar | PAN | Bank): show ✅ for each completed step, ⏳ for current, ⚪ for upcoming.
- Step header badge: "Pending" → "Completed ✓" once data saved.

## 2. Referral Dashboard Overhaul (`src/routes/referral.tsx`)

**Header (keep current dark wallet card)**
- "Total Wallet Earnings" + Available / Locked Bonus boxes — unchanged.
- Add **funnel filter icon** in top-right of the wallet header.

**Filter sheet (bottom sheet)**
- Status: All / Pending / Successful
- Traffic source: All / QR Code Visitors / Business Card / Direct Referral Link
- Filters apply to "Your referrals" list below.

**Segment strip (under wallet card, above list)** — matches your red-circled area
- 3 pill chips: `↗ Referral join` | `QR visitor` | `Business card`
- Tapping a chip switches the list source (referrals table / qr_visits / vcard_visits) and updates counters.

**Referral card redesign** (per screenshot 1)
- Replace phone `9810758733` with **`Joined: 20 Jun 2026`** (use `referrals.created_at`).
- Keep avatar + name + ON UNLOCK ₹200 + milestones strip.
- Remove Call/WhatsApp big buttons → move to overflow.
- Add **team earnings strip** below milestones: avatar stack + `₹243` + `12 Team` + chevron → opens bottom sheet listing downline users with their individual earnings contribution.

**New bottom sheets**
- `TeamEarningsSheet` — lists level-2 referrals of this user with per-person ₹ earned (uses existing `get_my_referral_overview` extended or new RPC `get_referral_downline(_referral_id)`).
- `QrVisitorsSheet` / `BusinessCardVisitorsSheet` — list of visits with timestamp + WhatsApp icon on right; long-press multi-select → bulk WhatsApp share with promo template.

## 3. Withdraw → KYC Gate

- `WithdrawGateSheet` (or wherever the "Withdraw to Bank" button lives in `referral.tsx`):
  - On click: check `kyc_verifications.status` for current user.
  - If not `approved` → router.navigate to `/vendor/kyc` (or open KycStepFlow sheet) directly, with toast "KYC pending — complete to withdraw".
  - If approved → open payout request modal as today.

## 4. Backend additions

**New table** `referral_link_visits`
- columns: `id`, `referrer_user_id`, `source` (`qr` | `vcard` | `link`), `code`, `visitor_ip_hash`, `user_agent`, `created_at`
- GRANT + RLS: owner can SELECT own; service_role full; anon INSERT via public route.
- Update `/r/$code`, `/c/$code`, QR scan route to log a row.

**New RPC** `get_referral_traffic_counts(_user_id uuid)`
- Returns `{ qr_visits, vcard_visits, link_visits, total_referrals, pending, successful }`.

**New RPC** `get_referral_downline(_referral_id uuid)`
- Returns each downline user + their lifetime earnings contribution.

**Admin toggle** — `vendors.active` / `customers.referral_active` boolean (add column if missing):
- New RPC `admin_toggle_referral_active(_user_id, _active)` — admin-only via `is_admin_user()`.
- Database trigger on `referral_rewards` INSERT: if `referrer.referral_active = false`, block reward creation.
- `src/routes/admin.referrals.tsx`: add per-row toggle switch that calls the RPC.

## 5. Referral flow explainer (Hindi summary in chat reply)

After implementation, I'll explain in Hindi:
- Sign-up → `apply_referral_code` inserts 3 locked rewards (₹200 referrer + ₹100 new user + ₹100 L1 upline)
- 1st service request → trigger releases that user's reward
- Vendor onboarding complete → trigger releases vendor reward
- Admin toggle off → future rewards blocked, existing locked stay locked

## Files to touch
- `src/components/KycStepFlow.tsx` — auto-advance, stable inputs, step ticks
- `src/routes/referral.tsx` — header filter, segment strip, redesigned cards, withdraw gate
- `src/components/WithdrawGateSheet.tsx` — KYC gate logic
- `src/components/TeamEarningsSheet.tsx` *(new)*
- `src/components/TrafficVisitorsSheet.tsx` *(new — QR + vcard visitors)*
- `src/components/ReferralFilterSheet.tsx` *(new)*
- `src/routes/admin.referrals.tsx` — active/inactive toggle
- `src/routes/r.$code.tsx`, `src/routes/c.$code.tsx`, QR scan route — log visits
- 1 migration: `referral_link_visits` table, traffic-count RPC, downline RPC, `referral_active` column + trigger, admin toggle RPC

## Open questions before I build
1. **Visit dedupe** — should repeat visits from the same IP/device within 24h count as 1 visit or N visits?
2. **WhatsApp bulk send** — browser cannot send to multiple numbers in one tap; the best UX is one `wa.me/<num>?text=...` per contact opened sequentially OR copy-all-numbers + message to clipboard. Which do you prefer?
3. **Admin toggle scope** — pausing a referrer should block (a) only future rewards, or (b) also hide their existing locked rewards from their wallet?
