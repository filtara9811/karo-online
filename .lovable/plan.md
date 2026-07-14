## Smart Scanner v3 — Roadmap Implementation

Building all 5 approved items in one coordinated pass. Everything reuses existing Lovable AI + Google Maps + IndexedDB stack — **no new API keys**.

---

### 1. Map Pin Preview (accurate location tagging)

- **New component:** `src/components/vendor-join/MapPinPreview.tsx`
  - Renders a mini Google Map from the extracted `address` (uses existing `src/lib/maps.functions.ts` → geocode server fn).
  - Shows a draggable pin so vendor can fine-tune (drag → reverse-geocode → update `address/city/state/pincode`).
  - Fallback: India Post Pincode API when geocoding fails.
  - Stores final `lat`, `lng` on the vendor row (existing `vendors.latitude/longitude` columns) so customers can be redirected to the shop location.
- **Wired into:** `SmartScannerSheet` review phase (below extracted fields) + `BusinessInfoSheet` (after auto-fill).

---

### 2. Admin Scan Insights Tab

- **Edit:** `src/routes/admin.vendors.tsx` — add a new **"Scan Insights"** tab.
  - Total scans (today / 7d / 30d)
  - Avg confidence score
  - Success vs empty scans
  - Field-level fill rate (which fields OCR misses most — helps improve prompt)
  - Recent scans table with thumbnail + confidence badge + vendor link
- **New server fn:** `src/lib/scan-history.functions.ts → getScanInsights` (admin-gated via `has_role('admin')`).

---

### 3. Vendor Listing Alignment Fix

- **Edit:** `src/routes/vendor.listing.tsx` — fix the awkward text alignment reported in screenshot #2:
  - Consistent left-align for name/address blocks
  - Fixed truncation for long business names
  - Uniform spacing between card rows
  - Confidence badge (from scan) shown as small chip near the vendor name so admins can spot low-quality onboardings at a glance.

---

### 4. Offline Capability (market-area resilience)

Reuse existing `src/lib/offline/` (IndexedDB via `idb`) infra — already used for leads/visits sync.

- **New queue types:** extend `QueuedAction` in `src/lib/offline/db.ts`:
  - `"scan.save"` — save scan (image + extracted JSON) locally when offline
  - `"vendor.scan_apply"` — pending "apply to vendor form" ops
- **New store:** `offline_scans` object store in IndexedDB — full image dataUrls + extracted results + kinds + createdAt.
- **New helper:** `src/lib/offline/scans.ts`
  - `queueScanOffline({ shots, extracted })` when `!navigator.onLine`
  - `syncPendingScans()` — auto-runs on `online` event via existing `startAutoSync()`
- **Offline OCR strategy:** since Gemini needs network, when offline:
  1. Save raw photos + kinds locally with `status: "pending_ocr"`
  2. Show them in Scan History tab with a **"Waiting for network"** badge
  3. On reconnect: auto-run OCR + save to server + update history
- **UI:** `SmartScannerSheet` shows offline banner ("Offline mode — will scan when back online"), disables live scan button but keeps photo capture.
- **Edit:** `src/lib/offline/sync.ts` — add `scan.save` handler to flush pending scans.

---

### 5. Confidence Scoring (visual quality indicator)

- **Server-side:** update `src/lib/ocr.functions.ts`
  - Extend Gemini prompt to also return `_confidence` per-field: `{ business_name: 0.95, mobile: 0.4, ... }`
  - Compute `overall_confidence` = weighted avg (mobile/business_name/address weighted higher).
  - New response field: `confidence: { overall: number, fields: Record<string, number> }`
- **UI:** in `SmartScannerSheet` review phase
  - Each field row gets a small color dot: 🟢 ≥0.8 (high), 🟡 0.5–0.8 (medium), 🔴 <0.5 (low — verify manually)
  - Overall confidence header bar: e.g. "Overall confidence: 87% — Good"
  - Low-confidence fields are auto-unchecked in the apply-set (user must opt-in).
- **Store:** overall confidence in `vendor_scan_history.confidence` (new column) + `vendors.auto_scan_confidence`.

---

### Technical Details

**Files created (5):**
- `src/components/vendor-join/MapPinPreview.tsx`
- `src/lib/offline/scans.ts`
- `src/components/admin/ScanInsightsTab.tsx`
- `src/components/vendor-join/ConfidenceBadge.tsx`
- `src/lib/scan-confidence.ts` (color/label helpers)

**Files edited (7):**
- `src/lib/ocr.functions.ts` — confidence extraction
- `src/lib/scan-history.functions.ts` — `getScanInsights` fn + confidence column
- `src/lib/offline/db.ts` — new store + queue types
- `src/lib/offline/sync.ts` — scan.save handler
- `src/components/vendor-join/SmartScannerSheet.tsx` — offline banner, confidence UI, map pin
- `src/routes/admin.vendors.tsx` — Scan Insights tab
- `src/routes/vendor.listing.tsx` — alignment fix + confidence chip

**Migration (1):**
- Add `confidence numeric` + `field_confidence jsonb` + `status text` (for pending_ocr) to `vendor_scan_history`
- Add `auto_scan_confidence numeric` to `vendors`
- Bump IndexedDB version to 2 (adds `offline_scans` store)

**Cost & performance:**
- Confidence extraction: adds ~200 tokens/scan (~₹0.05 extra)
- Map pin preview: uses existing Google Maps allowance (~free for typical vendor volume)
- Offline queue: 100% local, zero cost until sync

**Ordering:** migration first (needs approval), then all code edits in parallel.

---

Say **"go ahead"** and I'll start with the DB migration, then ship the code.