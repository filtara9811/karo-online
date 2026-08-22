# Simplify signup, universal login, direct dashboard routing

## 1. Fix the "Admin-managed customer fields" signup error

Confirmed cause (verified in the database, not a guess):

- Signup calls the `save_customer_profile` routine, which sets `verified = true` and claims the existing phone row by setting `user_id` on it.
- A validation rule on the customers table blocks any non-admin change to `verified`, `user_id`, `tags`, `is_blocked`, `admin_notes`, `assigned_to`, `referral_active` — and it runs before the rule that would have quietly reset those values. So a normal user's own signup raises the error.

Fix: mark the official signup routine as a trusted write (a request-scoped flag it sets itself), and let the two validation rules accept that flag. Everything else stays blocked exactly as today — a direct client update to `verified`/`user_id`/`tags` from the app still fails. No policy is loosened, no new anon access.

This is a database migration (needs your approval) plus no frontend change.

## 2. Reduce the registration form

Keep only: Gender, First Name, Last Name, Email, Referral Code (optional), plus the terms checkbox.

- Remove the Date of Birth row and the Address row from the signup step, along with their pickers and the "must be filled" requirement that currently blocks Submit.
- The draft-restore logic drops those two values too.
- Address/DOB can be filled later from the in-app Profile screen (that screen already supports them) — nothing is deleted from the database.

## 3. Universal login by mobile number

Already partly working: after OTP, the app looks up the phone across the customer base and, when a profile with a name exists, it finalises and logs in without showing the form. Two gaps to close:

- If the phone exists but the stored name is empty, the user is dropped into the full form. Change the rule to: any existing profile for that phone means "returning user" — sign in and continue, only asking for a name if the record has none.
- Vendors: the existing vendor-claim-by-phone path stays first, so a vendor who signs in on the customer app is still recognised.

## 4. Direct dashboard routing (no Switch Panel on launch)

Add one new admin setting: **Primary service**.

- Admin → Settings → Service Menu gets a "Primary / default service" selector next to the existing ON/OFF switches (choices limited to enabled services, plus "Let user choose").
- Stored in the same `service_menu` settings row as `primary` — no new table.

Behaviour after login/signup:

| Admin setting | What the user sees |
| --- | --- |
| Primary = QR Business | Straight into the QR Business dashboard. No Switch Panel. |
| Primary = any other service | Straight into that service's dashboard. |
| Primary = "Let user choose" | Current behaviour: the service menu appears. |
| Only one service enabled | Straight into it, even without a primary set. |

Also:
- The chosen destination is saved as the active workspace, so relaunching the app opens the same dashboard.
- The Switch Panel stays reachable from the profile sheet, so users can still move between panels manually.
- Vendor Panel keeps its smart target (dashboard if a vendor profile exists, otherwise the join screen).

## Technical notes

- `src/lib/service-menu.ts`: extend the config type with `primary?: ServiceId | null`; add `resolvePrimaryService(rows, primary)` returning the forced service or `null`.
- `src/hooks/use-service-menu.ts`: read and return `primary` alongside `services`.
- `src/components/AuthGate.tsx` and `src/routes/register.tsx`: after `RegistrationFlow.onComplete`, if a primary service resolves, `writeActiveService(id)` + navigate directly instead of rendering `ServiceMenuScreen`.
- `src/routes/index.tsx`: when no active service is stored but a primary exists, redirect to it (admin mandate wins over the default Quick Service render).
- `src/routes/admin.settings.tsx`: add the primary picker to the existing service-menu card; saves through the same `app_settings` upsert.
- `src/components/RegistrationFlow.tsx`: remove DOB/address state, pickers, props and the completeness gate; keep gender/name/email/referral validation and the email-availability check.
- Migration: request-scoped trusted-write flag honoured by `guard_customer_admin_fields` and `customers_freeze_admin_fields`, set only inside `save_customer_profile` (and the equivalent server-side finalise path).
