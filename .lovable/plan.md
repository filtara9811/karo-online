## Refer & Earn — Premium Architecture Upgrade

Keep the current cream / dark-brown / matte-gold UI of `/referral` (the user explicitly approved the existing card progress design). Only the highlighted areas change. Same component shells, same animations — just new data, new code format, flip back-face, split earnings, and admin override layer.

### 1. Database migration (single migration)

**Extend `referral_settings`** with admin-controlled dynamic config:
- `base_reward_amount numeric` (default 200) — replaces hard-coded ₹200
- `level_1_pct numeric` (default 90) — direct referrer share
- `level_2_pct numeric` (default 10) — upline override share
- `max_split_pct numeric` (default 50) — ceiling guard
- `activation_fee numeric` (default 1000) — plan unlock fee
- `play_store_url text` (default `https://play.google.com/store/apps/details?id=app.karoonline.twa`)
- `banner_image_url text`, `banner_title text`, `banner_subtitle text` — admin banner
- `offer_active boolean`, `offer_ends_at timestamptz`, `offer_label text` — timer banner

**Extend `referrals`**:
- `level_2_user_id uuid` (upline of the referrer at signup time — frozen lineage)

**Extend `referral_rewards`**:
- `level smallint` (1 or 2) — distinguishes direct vs override payout
- `pct_applied numeric` — snapshot of split at payout time

**Extend `referral_codes`**:
- The 4+4 code is generated client/server-side at registration. Add a new RPC `ensure_my_referral_code_v2(_first_name text, _phone text, _kind text)` that builds `UPPER(LEFT(first_name,4)) || RIGHT(regexp_replace(phone,'\D','','g'), 4)` (e.g. `ASHU9876`), de-dupes by appending a digit if collision, and upserts into `referral_codes`.

**New RPC `get_my_wallet_split()`** returns `{ total, personal, team, today, this_month }` by summing `referral_rewards` grouped by `level` for `auth.uid()`.

**New RPC `request_referral_withdrawal(_amount, _bank_account, _ifsc)`** — validates KYC approved + amount ≤ available wallet, inserts a `wallet_transactions` row of type `withdrawal_request`.

**Update `apply_referral_code`** to also capture `level_2_user_id` (the referrer's own referrer at signup) so the 2-level tree is frozen.

**New RPC `release_referral_reward(_referred_user_id)`** — called when Milestone 3 (activation payment) completes. Reads `referral_settings`, splits `base_reward_amount` into L1/L2 using `level_1_pct`/`level_2_pct` (capped by `max_split_pct`), inserts two `referral_rewards` rows (level=1 and level=2 when upline exists), credits both wallets, flips `referrals.status='approved'`.

**Update `get_my_referral_overview`** to also return for each row: `downline_count` (# of people that referred-user themselves referred), `downline_earnings` (sum of L2 rewards credited to me from this row's downline) — used on the flip back-face.

All new columns get GRANT + RLS preserved.

### 2. Frontend — `src/routes/referral.tsx`

**Header / banner**: render `banner_image_url` + `banner_title` + `banner_subtitle` + `offer_label` countdown chip from `referral_settings` (no hard-coded image/text). Keep existing card frame.

**Code box**: switch from `REF-XXXXXX` to the new 4+4 code (e.g. `ASHU9876`). On mount call `ensure_my_referral_code_v2` with the logged-in user's first_name + phone. Keep the gold-dashed container and one-tap copy button unchanged.

**Share / WhatsApp buttons**: keep current Play Store deep-link generation; ensure `shareUrl` uses `play_store_url` from settings + `?referrer=utm_source=referral&code=<NEW_CODE>`. No PWA hop.

**Wallet card (replaces current black "Total Wallet Earnings" block)**:
- Big number: **Total Wallet Earnings ₹X** (from `get_my_wallet_split.total`)
- Two pill rows below: **Direct Earnings ₹A** · **Team Earnings ₹B**
- Small row: **Today ₹C** · **This Month ₹D**
- Replace "Statement" button with **"Withdraw to Bank"** → opens bottom sheet that collects bank account + IFSC and calls `request_referral_withdrawal`. If KYC not approved or bank empty, sheet shows a "Complete KYC first" CTA that routes to `/vendor.kyc`.
- Keep "Share again" button.

**Referral cards (KEEP existing design exactly)** — only changes:
- Milestone labels updated to match the new flow: **1. App Install + First Request** · **2. Joined as Vendor** · **3. KYC + Activation Paid** (text only; the 3-dot progress UI stays identical).
- Add `transform-style: preserve-3d` + `rotateY` Framer Motion flip on tap. Front face = existing card. Back face = downline summary:
  - Avatar + name header
  - "Their network: N people" (from `downline_count`)
  - List up to 5 sub-referrals (name + status dot)
  - Highlight strip: "From this downline: +₹{downline_earnings}"
  - "Tap to flip back" footer
- Clicking the card flips (no longer opens the bottom sheet by default). Add a small "Details" link inside the back face to open the existing `ProgressSheet` for the full milestone timeline + WhatsApp nudges (preserves all current functionality).

### 3. Admin panel — `src/routes/admin.referrals.tsx`

Extend existing referrals admin page with a new **"Rewards Engine & Banner"** section that reads/writes `referral_settings`:
- Number inputs: Base reward amount, Activation fee, Level 1 %, Level 2 % (live validation: L1+L2 ≤ 100 and each ≤ `max_split_pct`), Max split ceiling
- Text inputs: Play Store URL, banner title/subtitle, offer label
- Image upload: banner image (reuses `admin/ImageUpload`)
- Toggle + datetime: offer active + offer ends at
- Save button calls a small `updateReferralSettings` server function (admin-gated via `requireSupabaseAuth` + `has_role('admin')`).

### 4. Hook updates — `src/hooks/use-referral.ts`

- Extend `ReferralOverview` types with `wallet: { total, personal, team, today, this_month }`, `settings: { banner_*, offer_* }`, and per-row `downline_count` + `downline_earnings`.
- Add `useReferralSettings()` hook for admin form.
- All other consumers (notifications etc.) unchanged.

### 5. Activation payment hook

In the existing vendor activation Razorpay success handler (Section 3 / Milestone 3), after marking `payment_completed` checkpoint, call new RPC `release_referral_reward(vendor_user_id)`. This is the single trigger that fans out L1+L2 payouts using the admin-controlled split.

### Out of scope (already done in earlier turns)
- Play Store deep linking on share buttons — already wired (kept).
- Device fingerprint + admin unlock — already shipped.
- Registration flow / DOB / Terms — already shipped.

### Files touched

- **New migration**: `supabase/migrations/<ts>_referral_engine_v2.sql`
- **Edit**: `src/routes/referral.tsx` (wallet split, flip cards, dynamic banner)
- **Edit**: `src/hooks/use-referral.ts` (types + new fields)
- **New**: `src/lib/referral-admin.functions.ts` (`updateReferralSettings`, `requestWithdrawal`)
- **Edit**: `src/routes/admin.referrals.tsx` (rewards engine + banner editor)
- **Edit**: vendor activation payment success path → call `release_referral_reward`
- **Edit**: `src/integrations/supabase/types.ts` regenerates after migration approval

Once the migration is approved, I'll implement all frontend + admin changes in a single parallel push, then verify the build and the `/referral` route.
