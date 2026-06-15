
## Goal
Replace the current full-page My Orders experience (for the Quick screen entry) with a premium bottom sheet overlay matching screenshot #3, using real data, while keeping the existing gold/cream design language. Quick Services orders and Digital Shop orders stay in separate buckets.

## Scope
- New component: `src/components/QuickOrdersSheet.tsx` — 95% height bottom sheet using vaul Drawer (consistent with existing sheets).
- Wire it into `src/routes/quick.tsx` so the existing "My Orders" entry on the quick screen opens this sheet instead of navigating to `/orders`.
- Keep `/orders` route untouched (used elsewhere, e.g. /home back-nav).
- Reuse `useMyOrders()` hook for real data — no mocks.

## Sheet structure (top → bottom)

1. **Header bar** (sticky)
   - Left: "Quick My Order Leads" (display font, gold gradient — matches existing Ledger header).
   - Right: round X button → closes sheet.

2. **Banner carousel**
   - Reuse existing `BannerCarousel` component (already shown on home) with 5-dot pagination.
   - Soft cream/gold placeholder background to match design.

3. **Source toggle** (NEW — required by user's "khaas nirdesh")
   - Two pills: **Quick Services** | **Digital Shops**.
   - Filters orders by `OrderSource`: `quick`/`service`/`lead` vs `shop`.
   - Persists last selection in localStorage.

4. **Status filter tabs** (horizontal scroll)
   - All Leads · Pending · Under Review (Active) · Service Completed (Done) · Enquiry Received
   - Each tab: icon + label + count badge; colored border per status (gray/yellow/red/green/light-green) matching screenshot.

5. **List header**: "All Leads Customer" (or selected filter label).

6. **Lead cards** (one card per lead, expandable)
   - **Top strip** (light yellow bg):
     - Avatar (vendor or "searching" placeholder)
     - Vendor Name + "Customer details" sub-line
     - Date/time (created_at formatted)
     - Right: Lead id `#XXXXXX` (last 6 of lead.id), status pill (Pending/Active/Cancel) with bell + unread count.
   - **Bottom strip** (light gray bg):
     - Service title (e.g. "AC | Service") + "Good and best service" tagline
     - Rating (vendor rating if available, else 4.9) + price (₹ from accepted vendor mapping)
     - Right: catalog item image (from `catalog_items.image_url`, already loaded by hook)
     - Bottom-right: chevron down → expands
   - **Expanded section**: shows full invoice/variations — list of `vendor_item_mappings` for this lead's accepted vendor (item name, qty, unit price, line total) + "More invoice" link → routes to existing chat/status.

7. **Empty / loading states** match existing cream styling.

## Data plan
- Source bucketing uses existing `OrderItem.source` already mapped in `use-my-orders.tsx`.
- Variations/invoice on expand: new lightweight query against `vendor_item_mappings` joined to `catalog_items` filtered by `lead_id` + `vendor_id`. Fetched lazily on first expand, cached per lead in component state.
- All counts (Pending/Active/Done) derived client-side from the already-loaded groups.

## Spell fixes (in new sheet only)
Quick My Order Leads · All Leads · All Leads Customer · Vendor Name · AC | Service · Customer.

## Visual rules
- Reuse existing tokens from `src/styles.css` (gold gradient, cream surfaces). No new color tokens.
- Cards: rounded-2xl, soft gold border, subtle shadow — slightly larger than current MyOrdersList cards per user request.
- Sans-serif body (existing Inter), display font for header only.

## Out of scope
- No changes to `/orders` route, `MyOrdersList`, or vendor dashboard.
- No backend schema changes; uses existing tables and RLS.
- Digital Shop orders source mapping already exists (`source = "shop"`); no migration needed.

## Files
- create: `src/components/QuickOrdersSheet.tsx`
- edit: `src/routes/quick.tsx` (swap navigation → open sheet)
- (optional) small helper hook `src/hooks/use-lead-invoice.ts` for lazy invoice fetch.
