## Phases 1–4: QR Asset System + Smart Customer Recognition

Shipping the core "print QR → onboard shop → recognize customer across shops" loop now. Phases 5–7 (field-exec login UI, KYC re-audit, live dry-run with test users) come next turn.

---

### Phase 1 — Backend foundation (single migration)

**Enum**
- Add `field_executive` to `public.app_role`.

**Tables (all with GRANTs + RLS + policies)**
- `qr_batches` — `id`, `batch_code` (e.g. `B12`), `size_preset` (`a4`/`a5`/`sticker`), `quantity`, `created_by`, `assigned_to_user_id` (field exec), `notes`.
- `qr_assets` — `id`, `batch_id`, `serial` (int), `code` (e.g. `B12-0457`, unique), `linked_vendor_id` (nullable, set once), `linked_at`, `status` (`unlinked`/`linked`/`disabled`).
- `qr_scans` — `id`, `qr_code`, `vendor_id` (nullable until linked), `customer_identity_id` (nullable), `device_fp`, `ip`, `user_agent`, `scanned_at`.
- `customer_identities` — central cross-shop identity: `id`, `mobile` (unique, E.164), `name`, `verified_at`, `first_seen_at`, `device_fps` (text[]). Built so future IVR/SMS/WhatsApp campaigns can target by mobile.
- `vendor_customer_visits` — per-shop history: `id`, `vendor_id`, `customer_identity_id`, `visit_count` (denorm), `first_visit_at`, `last_visit_at`, `source_qr_code`, `source_kind` (`stand`/`card`/`poster`/`referral`). Unique on `(vendor_id, customer_identity_id)`; `visit_count` and `last_visit_at` bumped per scan.

**RPCs**
- `admin_create_qr_batch(p_batch_code, p_quantity, p_size_preset, p_assigned_to)` — admin-only; generates `quantity` rows in `qr_assets` with serials `0001…N`.
- `field_link_qr_to_vendor(p_code, p_vendor_id)` — caller must be assigned field-exec or admin; one-shot lock (errors if already linked).
- `resolve_qr(p_code)` — public read: returns `{ vendor_id | null, vendor_card }` so `/q/:code` can branch.
- `record_customer_visit(p_code, p_mobile, p_name, p_device_fp)` — upserts `customer_identities` by mobile, upserts `vendor_customer_visits`, inserts `qr_scans`. Returns visit summary for the vendor toast.
- `vendor_get_visitors(p_filter, p_sort)` — vendor reads own visit list with name, mobile, count, last visit, source, day-of-week.

**Triggers**
- `qr_assets`: block updating `linked_vendor_id` once set (immutable after first link).
- `vendor_customer_visits`: increment `visit_count` and set `last_visit_at` on insert/update via RPC.

**OTP cost decision needed** — see open question below.

---

### Phase 2 — Admin: QR Assets & Printing

New route `src/routes/admin.qr-assets.tsx`:
- "Create Batch" form: code prefix, quantity, size preset, assign-to (field-exec dropdown).
- Batch list with status (printed / linked count / unlinked count).
- "Download PDF" per batch in 3 presets:
  - **A4 Sheet** — grid of QRs for wall posters.
  - **A5 Standee** — one large QR per page.
  - **Sticker** — small stickers grid for mobile back/notebook.
- PDF generation uses `pdf-lib` + `qrcode` (already Worker-safe), in a `createServerFn` returning a base64 PDF. URL embedded: `https://karoonline.in/q/B12-0457`.

---

### Phase 3 — Customer landing `/q/:code` + Smart Recognition

New route `src/routes/q.$code.tsx`:

1. Call `resolve_qr(code)`.
2. **If `vendor_id` is null** → show "Link this QR to your shop" CTA (signed-in vendor only). Calls `field_link_qr_to_vendor` (vendor self-link allowed for now; gated to admin/field-exec later if needed).
3. **If linked** → check device fingerprint + cookie `cust_id`:
   - **Recognized** (mobile already verified anywhere on platform) → silently call `record_customer_visit`, show vendor card with "Welcome back, {name}! Visit #{n}".
   - **Unrecognized** → bottom sheet: Name + Mobile + OTP. On verify, call `record_customer_visit`, set cookie, show vendor card.
4. Push live "New visitor" toast to vendor via Supabase realtime channel `vendor:{id}:visits`.

---

### Phase 4 — Vendor dashboard: Visitors tab

New tab in vendor home → `src/routes/vendor.visitors.tsx`:
- List of visitors with: Name, Mobile, Total visits, Last visit (`20 June 2026, 22:00` + `Saturday`), Source QR (`stand`/`card`/`poster`), per-row Call / WhatsApp buttons.
- Sort: Most loyal (by visit_count) / Most recent (by last_visit_at).
- Filter: source kind.
- Realtime subscription → welcome toast when a customer arrives.
- IVR / Campaign buttons present but disabled with "Coming soon" (data model already supports it via `customer_identities.mobile`).

---

### Open question (1)

**Customer OTP cost on first scan** — every brand-new customer scanning any QR triggers one SMS OTP via the existing gateway (billed per send). Two choices:

- **A. OTP-verified mobile** (recommended) — clean dataset for future IVR/WhatsApp campaigns, blocks fake numbers, costs ~1 SMS per new customer.
- **B. Name + Mobile only, no OTP** — zero SMS cost, faster signup, but some entries will be fake/typo'd numbers and future SMS campaigns will bounce.

Pick A or B and I'll wire it in.

---

### Technical notes
- All new tables: GRANT to `authenticated` + `service_role`; `qr_assets` and `vendor_customer_visits` also `SELECT TO anon` only for the safe `resolve_qr`/landing flow (filtered via RPC, not direct table reads).
- `customer_identities.mobile` is the cross-shop join key — future IVR and campaign modules query by mobile.
- Field-exec role added now; login UI + assigned-batch view ships in Phase 5 next turn.
- No edits to KYC/withdraw in this batch (Phase 6).
