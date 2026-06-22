
# Karo Online — Production Readiness Plan

Splitting your request into two phases. Phase 1 ships now (visible UI work). Phase 2 is a backend audit that needs a few specifics from you before I touch live data.

---

## Phase 1 — UI/UX Redesign (ship this turn)

Target file: `src/routes/quick.tsx` (+ `QuickServiceMap.tsx` for pin tap → vendor card).

### 1. Filter Bar (above search bar)
A single horizontal pill row directly above the main search input:

```
[ 📍 Current Location ] | [ 🏙 City Search ] | [ 🎯 10 km ▾ ]
```

- **Current Location** — taps re-runs GPS, recenters map, refreshes "near me" address chip.
- **City Search** — opens existing `LocationPickerSheet` in city-drill mode (State → City → Area).
- **Radius** — opens a compact popover with the existing `RadiusSlider` (1–25 km). Selected value shows in the chip.

Styling: glass pill, `bg-background/80 backdrop-blur`, single-line, horizontally scrollable on small widths, `shrink-0` on each chip, divider `|` between.

### 2. Auto-Detect Location on Open
- On `QuickPage` mount, immediately call `useGeolocation()` with `{ enableHighAccuracy: true }` and recenter map without waiting for any user action.
- If permission is denied, fall back to last-known cached center (already in `cachePeek`) and show a soft toast "Tap 📍 to enable location".

### 3. Left Category Rail
Move the current bottom/inline category chips into a fixed **vertical rail on the left edge of the screen**, overlapping the map:

- 56 px wide, rounded right edge, frosted background
- Each icon = one category (AC / Carpenter / Plumber / Painter / Movers / Chef / Legal / Finance …)
- Active category has an orange ring + green dot (matches your screenshot)
- Vertically scrollable when overflow

This is the Uber-style sidebar you sketched. The right side of the screen frees up for the map.

### 4. Dynamic Map Pins per Category
- `QuickServiceMap` already renders pins. Change the pin's inner `<img>` to use `SLUG_IMAGE[activeSlug]` so when **Plumber** is selected, every visible pin uses the plumber icon (and only plumber vendors render). Carpenter → carpenter icon, etc.
- Filter the vendor list passed into the map by `vendor.cat === activeVendorKey` before rendering.

### 5. Vendor Detail Pop-up on Pin Tap
- Add `onClick` to each pin in `QuickServiceMap`.
- Tap opens a bottom sheet (`VendorListSheet` already exists — reuse with a single-item filter) showing: avatar, name, area, km, rating, "Call" + "Send Request" actions.

### Out of scope for Phase 1
I will not redesign the lower service-card list, the bottom tabs, or the top "Join Business" badge — those weren't called out and stay as-is.

---

## Phase 2 — Lead Broadcast Audit (next turn, needs your input)

The broadcast pipeline today:

```
Customer raises lead
   → INSERT public.leads
   → DB trigger lead_broadcast_after_insert
   → SELECT vendors WHERE category match AND ST_DWithin(geog, lead_geog, radius)
   → INSERT public.lead_broadcasts (one row per vendor)
   → Realtime publication → vendor app subscribes to lead_broadcasts WHERE vendor_id = me
   → Vendor app shows alert + (optional) WhatsApp webhook
```

Failure points I want to inspect, in order of likelihood:

1. **Trigger silently filtered everything out** — vendor `serviceable_zone` / `categories` JSON empty after the recent onboarding refactor, so `WHERE` matches 0 rows. (Most likely cause.)
2. **Realtime publication missing column** — after the recent security migration that hardened `supabase_realtime` publication, the vendor app's subscribe filter may reference a stripped column and silently never fire.
3. **Vendor app channel scope** — listener subscribes before `auth.uid()` is known, so RLS denies every row.
4. **WhatsApp webhook** — `_lead_whatsapp_webhook_url()` returns `NULL` if the secret is missing; trigger swallows the error.

### What I need from you before running the audit
1. A real `lead_id` from the last 24h that "should have" broadcast but didn't.
2. The vendor_id of one vendor in range who didn't receive it.
3. Confirm I can read `lead_broadcasts`, `vendors`, `leads` rows (read-only, no writes).

Once you reply with those, I'll run the SQL probes and post a written audit (root cause + fix migration) — no schema changes until you approve.

---

## Order of execution
1. Approve this plan.
2. I implement Phase 1 (one turn, ~3 files touched).
3. You verify UI on device, send the 2 IDs above.
4. I run Phase 2 audit and post findings.
