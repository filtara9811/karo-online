# Service Selection Menu + Admin ON/OFF control

## What changes for users

**New user:** Name + mobile → OTP → straight to a full-screen **Service Selection Menu** (Digital Shop, Vendor Panel, Quick Service, Digital QR Code). Tapping a tile routes directly into that service's dashboard. The old buyer/seller role screen is replaced by this menu.

**Returning user (logged out, logs back in):** mobile + OTP recognises the existing profile, skips the registration form, and shows the same Service Selection Menu.

**Admin:** a new "Service Menu" panel in Admin → Settings with an ON/OFF switch per service. Services toggled OFF disappear completely from the user menu. If only one service is enabled, users are routed there directly without showing the menu.

## Services and destinations

| Service | Route |
| --- | --- |
| Quick Service | `/quick` |
| Digital Shop | `/vendors` (shop discovery) |
| Vendor Panel | `/vendor/dashboard` if the user already has a vendor profile, else `/vendor/join` |
| Digital QR Code | `/one-qr` |

## Technical notes

**Config storage** — one `app_settings` row, key `service_menu`, value `{ services: [{ id, enabled, order }] }`. Labels, icons and routes stay in code (`src/lib/service-menu.ts`); only enable/order come from the DB. Migration: insert the default row (all ON) and add `'service_menu'` to the allow-list arrays in both existing `app_settings` SELECT policies (`Public can view safe app settings`, `Authenticated can view safe app settings`) so the menu can render pre-login. Writes stay admin-only via the existing policies.

**New files**
- `src/lib/service-menu.ts` — service catalogue (id, label, sub, icon, route) + default order.
- `src/hooks/use-service-menu.ts` — reads the `service_menu` row, merges with the catalogue, returns enabled services (all ON if the row is missing).
- `src/components/ServiceMenuScreen.tsx` — full-screen menu (Karo Online branding, glass tiles matching the existing Quick Menu look), takes `onPick(service)`.

**Wiring**
- `src/components/AuthGate.tsx`: after `RegistrationFlow.onComplete`, render `ServiceMenuScreen` instead of `RoleChoiceScreen`; on pick, close the gate and `navigate({ to: route })`.
- `src/routes/register.tsx`: same swap for the standalone `/register` path.
- Returning-user path already auto-finalises via `lookup_customer_by_phone` in `RegistrationFlow.finalizeNow` and calls `onComplete` — it therefore lands on the same menu with no extra work; the vendor-claim branch keeps its own behaviour.
- `RoleChoiceScreen.tsx` stays in the repo unused (no other callers) — removed only if you want it gone.
- Vendor Panel tile resolves its target with the existing `vendors` lookup used in `ProfileHubSheet`.

**Admin panel** — new section in `src/routes/admin.settings.tsx` following the existing load/save pattern (`app_settings` upsert by key): list of switches with drag-free up/down order buttons and a Save button.

**Out of scope** — no change to OTP/verification logic, no change to the individual dashboards, no change to `ProfileHubSheet` (it keeps its current tiles, but will also respect the admin toggles for the four services above).
