# QR Asset System + Customer Recognition + Audit — Plan

## Phase 1 — Backend foundation (1 migration)
- Add `field_executive` to `app_role` enum.
- Tables:
  - `qr_batches` (id, code prefix `B<n>`, label, size_preset enum a4/a5/sticker, count, created_by, assigned_to, created_at)
  - `qr_assets` (id, batch_id, serial int, code text unique `B12-0457`, vendor_id nullable, locked_at, scan_count, kind enum shop/mobile/wall, created_at)
  - `qr_scans` (id, qr_code, customer_id, ip_hash, device_fp, scanned_at)
  - `customer_identities` (user_id PK, name, phone unique, phone_verified, device_fps text[], first_seen, last_seen) — central cross-shop identity
  - `vendor_customer_visits` (vendor_id, customer_id, qr_code, visited_at, visit_no) for per-shop history
- RPCs:
  - `admin_create_qr_batch(label, count, size)` → returns batch + assets
  - `link_qr_to_vendor(code, vendor_id, kind)` → enforces 3-per-vendor + lock-once
  - `record_qr_scan(code, name?, phone?, otp?, device_fp)` → upsert identity, record visit, return vendor info + "is_returning"
  - `vendor_get_visitors(filter, sort)` → list w/ visit count, last visit, day
  - `admin_toggle_referral_active(user_id, active)` — already exists, verify
- Triggers: lock qr_asset on first vendor link; block re-link.
- GRANTs + RLS.

## Phase 2 — Admin QR Assets page
- `/admin/qr-assets` route: create batch form, list batches, "Print PDF" buttons per size preset.
- PDF generation via server route `/api/admin/qr-batch-pdf/:batchId?size=a4|a5|sticker` using `pdf-lib` + `qrcode` (both worker-safe). Bulk QR rendering on PDF pages.
- Field-exec assignment dropdown per batch.

## Phase 3 — QR landing route `/q/:code`
- Resolves QR code, checks if vendor-linked:
  - If NOT linked → if scanner is a vendor → "Link to your shop?" UI calling `link_qr_to_vendor`. Otherwise show "Pending activation".
  - If linked → customer flow: check identity (device_fp + cookie). If new → Name + Mobile + OTP sheet. If recognized → record visit silently, show vendor card.
- Push to vendor dashboard via realtime broadcast on `vendor:{id}:visits`.

## Phase 4 — Vendor dashboard "Visitors"
- New tab on vendor dashboard: list w/ name, mobile, visit count, last visit timestamp + day, source QR kind.
- Per-row actions: WhatsApp (wa.me), Call (tel:), IVR placeholder.
- Welcome toast via realtime when new visit arrives.
- Sort by frequency / last visit.

## Phase 5 — Field-exec login
- `/field` route gated by `field_executive` role.
- Shows assigned batches + vendors they linked (via `created_by`/`installed_by` column on vendors).

## Phase 6 — KYC + Withdraw audit (small fixes)
- Verify PAN/Bank inputs are stable (already done last turn, recheck).
- Verify Withdraw → KYC gate (already done, recheck).
- Verify admin referral toggle blocks rewards (trigger already added, recheck).

## Phase 7 — Dry-run audit
- Create 3 test accounts via supabase admin API in a script.
- Simulate: signup w/ ref → 1st service request → vendor payment.
- Print wallet state at each step.

## Open questions answered
- ID format: `B<batch>-<serial>` ✓
- Role: create `field_executive` ✓
- Customer recognition: Name+Mobile+OTP first time, silent recognition after ✓
- Audit: live execution ✓
