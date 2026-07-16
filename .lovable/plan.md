## Scope

Two independent tracks:

**A. Staff App → Gig-Work Marketplace UI + flow**
**B. Admin → dedicated Onboarding Video control page (fix visibility + persistence)**

---

## A. Staff App: Gig Marketplace

### A1. Home screen redesign (`src/routes/staff.index.tsx`)

Replace current chat-list home with a marketplace dashboard modeled on the reference screenshot:

- **Header**: avatar + "Hi, {name}" + tier badge (Bronze/Silver/Gold based on completed tasks) + notification bell.
- **Earnings hero card** (purple gradient like screenshot): Balance ₹, big number, **Withdraw** button (opens existing withdraw sheet from `staff.wallet.tsx`), Total Earning row at bottom.
- **Task Pool section** ("AVAILABLE TASKS"): horizontal category chips (All / Field / Remote / Data / Marketing) + 2-col grid of task cards. Each card: icon, title, "Earn upto ₹X", Start Task button.
- **Top Earners leaderboard**: horizontal scroll strip, top 5 staff by 30-day earnings (rank, avatar, name, ₹).
- **Bottom nav** stays (Home/Tasks/Wallet/Chats — rename Vendors→Tasks since tasks now cover all work types).

### A2. Public signup (frictionless)

- Update `staff.login.tsx`: single form — Name, Phone, Email (optional), OTP.
- Server fn `publicStaffSignup` in `staff.functions.ts`: on OTP verify, auto-create `staff_profiles` row + grant `staff` role + init `staff_wallets` — **no admin approval**. Auto-link if phone already exists in `customers`.
- Remove/bypass `staff_signup_requests` approval gate for this path (keep table for legacy).

### A3. Task execution + auto-pay

- **Start Task** → opens task form route `/staff/task/$taskId` (dynamic per `task_type`: vendor_onboarding uses existing OCR camera flow; data_entry uses plain form; marketing uses link submit).
- On submit, server fn `submitTaskWork`:
  1. Save submission + AI confidence score (already computed by OCR for onboarding; other types default 100 or use validator).
  2. **If confidence ≥ 80** → auto-approve, credit `staff_wallet_ledger`, mark task `paid`, no admin queue.
  3. Else → status `submitted` (admin reviews as today).
- Threshold stored in `app_settings.staff_autopay_threshold` (default 80) so admin can tune.

### A4. Tiered incentives (schema only, admin UI later)

New table `staff_incentive_tiers`:
- `task_type`, `min_completed`, `max_completed`, `multiplier` (or fixed `amount_inr`), `active`.
- Server fn `resolveTaskAmount(staff_id, task_type, base_amount)` applies tier at credit time.
- Seed default tier (1–10 = 1.0×, 11–50 = 1.1×, 51+ = 1.25×).

### A5. Task categorization

Extend `staff_tasks.task_type` enum values: `field_vendor_onboarding`, `field_visit`, `remote_data_entry`, `remote_affiliate`, `marketing_share`. Add `requires_gps bool`, `requires_camera bool` columns for form routing.

### A6. i18n scaffold

Add `src/lib/i18n.ts` with `en` / `hi` dictionaries covering staff screens; language toggle in staff header, persisted to `localStorage`. No full translation of admin — staff surfaces only.

### A7. Leaderboard

Server fn `getTopEarners({ period: '30d' })` — sums `staff_wallet_ledger` credits grouped by staff, joins name/avatar, returns top 5. Called from home.

---

## B. Admin Onboarding Video — dedicated page

Current state: `VendorOnboardingVideoCard` lives inside `admin.onboarding.tsx` but user can't find/use it.

### B1. Separate route

New route `src/routes/admin.video.tsx` — "Onboarding Video" with its own sidebar entry (Video icon) in `AdminLayout.tsx`, above/near Onboarding.

### B2. Controls

- **Enabled toggle** (switch) — persists `app_settings.vendor_onboarding_video.enabled`.
- **Source tabs**: `YouTube URL` | `Direct URL (mp4/webm)` | `Upload file`.
- Upload uses Supabase Storage bucket `onboarding-videos` (create in migration, public read). Show progress bar; on success sets URL.
- **Live preview** panel — renders `<video>` (or YouTube iframe if youtube.com/youtu.be) using the currently saved value; reloads after save.
- **Save button** writes `app_settings.vendor_onboarding_video = { url, kind, enabled }` via server fn (upsert with proper JSON merge — the current bug likely: writes were partial-overwriting or key mismatch).
- Show "Current active URL" text + Copy button + "Test on vendor join page" link (`/vendor/join?preview=1`).

### B3. Fix persistence

Audit the existing upsert in `admin.onboarding.tsx` — ensure key is exactly `vendor_onboarding_video`, value is `{ enabled, kind, url }`, and reload uses the same shape. `vendor.join.tsx` already reads `.enabled` and `.url` — keep contract stable.

---

## Database migration (single)

```sql
-- Tiered incentives
CREATE TABLE public.staff_incentive_tiers (...);
GRANT SELECT ON public.staff_incentive_tiers TO authenticated;
GRANT ALL ON public.staff_incentive_tiers TO service_role;
ALTER TABLE ... ENABLE RLS;
CREATE POLICY "read tiers" ... USING (true);

-- Task category flags
ALTER TABLE public.staff_tasks
  ADD COLUMN requires_gps bool DEFAULT false,
  ADD COLUMN requires_camera bool DEFAULT false,
  ADD COLUMN ai_confidence numeric;

-- Auto-pay threshold + video settings
INSERT INTO public.app_settings(key, value) VALUES
  ('staff_autopay_threshold', '80'::jsonb),
  ('vendor_onboarding_video', '{"enabled":false,"kind":"url","url":""}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Storage bucket for video uploads (public read)
INSERT INTO storage.buckets(id, name, public) VALUES ('onboarding-videos','onboarding-videos',true)
ON CONFLICT DO NOTHING;

-- Trigger: on staff_tasks status→paid, credit wallet with tier multiplier
CREATE FUNCTION public.credit_staff_on_paid() ...;
CREATE TRIGGER ... AFTER UPDATE ON public.staff_tasks ...;
```

---

## Files

**New**: `src/routes/admin.video.tsx`, `src/routes/staff.task.$taskId.tsx`, `src/lib/i18n.ts`, migration.

**Edit**: `src/routes/staff.index.tsx` (full rewrite → marketplace home), `src/routes/staff.tsx` (rename Vendors→Tasks tab), `src/routes/staff.login.tsx` (frictionless signup), `src/lib/staff.functions.ts` (add `publicStaffSignup`, `getTopEarners`, `submitTaskWork`, `listAvailableTasks`), `src/components/admin/AdminLayout.tsx` (add Video link), `src/routes/admin.onboarding.tsx` (remove video card, link out to new page).

---

## Testing (Playwright)

1. Staff signup → home shows earnings card + task grid + leaderboard.
2. Start a task with confidence 90 → wallet auto-credits, task shows `paid`.
3. Start a task with confidence 60 → status `submitted`, no credit.
4. Admin `/admin/video` → toggle on, paste YouTube URL, save, reload → preview plays; open `/vendor/join` → video shows.
5. Toggle off → `/vendor/join` shows static bg.

---

## Out of scope

Full Hindi translation of every string (scaffold only), tier admin UI (schema ready, edit via SQL for now), native APK rebuild.