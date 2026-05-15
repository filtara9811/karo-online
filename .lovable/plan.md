# Screen 3 — Finding & Vendor List Overhaul

## 1. Faster screen transitions
- Reduce `setTimeout(setFindingOpen, 200)` in `quick.tsx` to instant (`0ms`) so finder opens immediately after request submit.
- Remove animation duration overhead in finder open (drop spring stiffness wait).

## 2. New Finding overlay behavior (`FindingVendorOverlay.tsx`)
- Keep premium gold radar visual at top.
- As vendors accept (live from `lead_notifications` realtime), each vendor card slides in from bottom **blurred / faded (opacity ~0.35, blur-sm)** and stacks below the radar.
- Radar stays animating for ~10–15s OR until 5 vendors arrive (whichever first).
- On finish: radar shrinks into a green ✓ check, blur clears, all vendor cards become fully visible — then auto-transition to Vendor List Sheet.
- Remove old "0–1km / 3km / 5km / 10km" step pill — replace with simple "Finding nearby vendors…" → "✓ Found N vendors".

## 3. Vendor List Sheet rework (`VendorListSheet.tsx`)
Each vendor card shows:
- Cover banner (vendor's `cover_url`) — premium themed background.
- Avatar + Vendor name.
- Delivery rating (stars + count).
- Vendor's accept note / quoted price (from `lead_notifications.note` or accept response).
- Two buttons just below profile:
  - **Approve** (green, primary)
  - **Chat** (secondary) — opens chat sheet directly without approving.
- Tapping the card body (not buttons) also opens chat sheet.

Behavior on Approve:
- Mark approved vendor → highlighted (gold ring + "Approved" badge).
- All other vendor cards become **non-interactive (opacity 0.4, pointer-events none)**, still visible.
- Lead is moved to "My Orders" (call existing approval RPC if available; otherwise update lead row with `approved_vendor_id`).
- Sheet can be minimized (X) → returns to home; status persists.

## 4. Chat sheet (replace navigation to `/chat`)
- Open chat as a **bottom sheet 70–80% height** (not full-page navigation), with X in top corner.
- Reuse the **exact** chat UI from My Orders → product chat (`LeadChatThread` / `ChatSheets`).
- Multiple vendors can be chatted with sequentially before approval.
- Closing chat returns to the vendor list (state preserved).

## Technical notes
- Need new vendor accept-note field: check `lead_notifications` schema for `vendor_note`/`quoted_price`. If absent, add migration: `ALTER TABLE lead_notifications ADD COLUMN vendor_note TEXT, quoted_price NUMERIC`.
- Add `approved_vendor_id UUID` on `leads` if not present, plus RPC `approve_lead_vendor(_lead_id, _vendor_id)`.
- Reuse `LeadChatThread` component inside a `Sheet` from `components/ui/sheet.tsx`.
- Stream accepted vendors into `FindingVendorOverlay` via the same `get_lead_accepted_vendors` RPC + realtime channel that `VendorListSheet` already uses — lift into a shared hook `useAcceptedVendors(leadId)`.

## Files touched
- `src/components/FindingVendorOverlay.tsx` — major rework (radar + live vendor stack).
- `src/components/VendorListSheet.tsx` — Approve/Chat buttons, approved highlight, dim others.
- `src/components/VendorChatSheet.tsx` — NEW, wraps `LeadChatThread` in 80% bottom sheet.
- `src/routes/quick.tsx` — faster transition, wire approval + chat sheet, drop full-page chat nav.
- `src/hooks/use-accepted-vendors.ts` — NEW shared hook.
- DB migration if `vendor_note` / `quoted_price` / `approved_vendor_id` missing.

Approve this plan to proceed — I'll start with the DB check + migration, then build the components.
