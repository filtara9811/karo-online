## Goal
Find Vendor complete होने के बाद ditto screenshot जैसी unified screen — top में live map (real nearby vendors + distance labels), बीच में product/service header card, नीचे horizontal vendor rail (avatars + rating + price), और by-default एक vendor के साथ chat open. Customer एक-एक करके सब vendors से बात कर सके।

## Scope
सिर्फ customer-side "post-radar" experience बदलनी है। Radar (`FindingVendorOverlay`) और chat engine (`LeadChatThread`) — दोनों untouched। Existing `VendorListSheet` अलग "manage/approve" flow के लिए बना रहेगा (approve/track/cancel के लिए), पर radar-complete पर default नया hub खुलेगा।

## New component: `VendorChatHub`
File: `src/components/VendorChatHub.tsx` (single full-screen sheet, mounted from `src/routes/quick.tsx`).

Layout (top → bottom):
1. **Map strip (~38vh)** — reuse `QuickServiceMap`-style Google Map centered on customer, with **real accepted vendors** as pins. Each pin shows a small avatar bubble + `X.X km` label. Data source: `get_lead_accepted_vendors` RPC (already returns `distance_km`, `avatar_url`) + customer location. Radius chip top-left, bell/locate buttons top-right (visual parity with screenshot).
2. **Product header card** — image, category, price range, "N Vendors Available" green pill, call + kebab buttons. Data from active inquiry + accepted vendor prices.
3. **Vendor rail (horizontal scroll)** — each card: avatar with online dot, name, "Online" chip, ⭐ rating, ₹ price, "Est. X min". Active vendor highlighted with orange ring. Last tile: **"All Vendors 5+"** → opens existing `VendorListSheet` for full management.
4. **"You are chatting with X about Y" banner** + **Change Vendor** button (also switches by tapping rail card).
5. **Chat body** — mount `LeadChatThread` with `peer = activeVendor`, `myRole="customer"`. Keyed by `vendor_id` so switching resets scroll/thread state cleanly.

Default vendor = first (closest) accepted vendor. Rail tap → swaps `activeVendor` → chat re-mounts for that peer.

## Wiring
`src/routes/quick.tsx`:
- Replace `FindingVendorOverlay.onComplete` payload — instead of `setActiveInquiry({ open: true })` (which opens `VendorListSheet`), set a new `hubOpen` state and mount `<VendorChatHub leadId={...} category={...} productImage={...} onClose={...} onManage={() => open VendorListSheet} />`.
- `VendorListSheet` still available via "All Vendors" tile / "Change Vendor" long-press for approve/cancel actions.

## Real data guarantees
- Map pins & rail use `get_lead_accepted_vendors` (RLS-scoped, already returns real vendor profiles + distance). Realtime subscription on `leads` + `lead_notifications` so new accepts appear live.
- No mock avatars/prices — fallbacks stay minimal (initial letter, "—") when a field is null.

## Out of scope (this turn)
- Approve/track UI changes (stays in `VendorListSheet`).
- Vendor-side changes.
- Any DB/RPC changes — existing schema already returns everything needed.

## Technical notes
- New file only: `src/components/VendorChatHub.tsx` (~350 lines).
- Small edits in `src/routes/quick.tsx` around the finder `onComplete` handler.
- Map: reuse `@react-google-maps/api` pattern already used in `QuickServiceMap.tsx`; custom OverlayView for avatar+distance markers.
- Chat: reuse `LeadChatThread` unchanged; pass `peer` object built from selected `AcceptedVendor`.

Confirm करें तो implement कर देता हूँ।