# Vendor Mapping UI + Notification Fixes

Aapki screenshot aur description ke hisaab se yeh chaar groups mein kaam karunga.

## Group 1 — Vendor Services UI redesign (`vendor.services.tsx`)

Naya layout exactly screenshot jaisa:

```text
┌─────────────────────────────┐
│  AC                       × │   ← items sheet (currently selected category)
│  ON karein wo services...   │
│                             │
│  [img] AC Service   [○──]   │
│  [img] AC Repair    [○──]   │
│  [img] AC Install   [──●]   │
│  ...                        │
├─────────────────────────────┤
│ 🤝 Basic sarvic  │ 🖼 Ac vand│  ← row 2: category (L) | sub-cat (R)
├─────────────────────────────┤
│ ⚙ Sarvic  📦 Products  Other│  ← row 1 (bottom): type tabs
└─────────────────────────────┘
```

- Bottom-most bar: 3 type pills (Service / Products / Other), active pill = bronze fill.
- Middle bar: left = current category picker, right = current sub-category picker. Tap left → category bottom sheet slides up; tap right → sub-category sheet.
- Top sheet (largest): items of the selected sub-category, each with ON/OFF toggle (current style, green when on).
- Single screen — no stacked modals. Selections drive what the top list shows.

## Group 2 — Pricing & Variation popup before turning ON

Jab vendor kisi item ka toggle OFF→ON karta hai, pehle ek `ItemPricingSheet` khulta hai:

- Inputs: `price_min`, `price_max` (₹), short `notes` (textarea).
- Variation chips (multi-select checkboxes): **Wholesale**, **Retail**, **Manufacture** (+ "Add custom" chip).
- Buttons: **Cancel** (toggle stays OFF) / **Enable** (saves and turns ON).
- On save → insert into `vendor_item_mappings` with `{ price_min, price_max, notes, variations: string[] }`.

Migration: add `price_min numeric`, `price_max numeric`, `notes text`, `variations text[]` columns to `vendor_item_mappings` (nullable, defaults). RLS unchanged.

Customer lead card already shows vendor list — uss list me ab `price_min–price_max` aur variations chips dikhayenge (read from mapping). Edit allowed: "Edit" pencil on each ON row reopens the same sheet.

## Group 3 — Vendor form re-show + per-card unread count

- `vendor.register.tsx`: gate is already present but laggy — add a `sessionStorage` cache (`vendor:registered:<uid>=1`) set on first successful check so subsequent opens skip the network roundtrip and render dashboard instantly.
- `VendorLeadInbox` / lead cards: add unread message badge per lead. Query `lead_messages` (or existing chat table) `WHERE lead_id IN (...) AND read_by_vendor = false GROUP BY lead_id`. Show small red pill with count on the card, same pattern as customer "My Orders".
- Mark-read on lead open.

## Group 4 — Background push + new tone

- Replace current alert sound file with a softer two-tone chime (`/public/sounds/lead-alert-v2.mp3` — short, pleasant). Update `src/lib/lead-sound.ts` to point at it.
- Ensure FCM `firebase-messaging-sw.js` shows a system notification with `requireInteraction: true`, vibration pattern, and an "Accept" / "View" action — so vendor gets it even when app/screen is closed. Wire `notificationclick` to open `/vendor/lead/<id>`.
- Server side: when a lead is created and a matching vendor exists, the existing push function should fire with `data: { leadId, type: 'new_lead' }` + a high-priority `notification` payload (already wired — verify and fix if missing).

## Files touched

- `src/routes/vendor.services.tsx` — full redesign (single screen, 3 bars)
- `src/components/ItemPricingSheet.tsx` (new)
- `supabase/migrations/<ts>_vendor_mapping_pricing.sql`
- `src/routes/vendor.register.tsx` — sessionStorage fast-path
- `src/components/VendorLeadInbox.tsx` (+ card component) — unread count badge
- `src/lib/lead-sound.ts` + new `public/sounds/lead-alert-v2.mp3`
- `public/firebase-messaging-sw.js` — action buttons + vibration
- `src/lib/push.functions.ts` — verify high-priority payload

Execution order: Group 1 → Group 2 (DB + sheet) → Group 3 → Group 4. Confirm karein "haan start karo" toh main shuru karta hun, ya kisi group ko pehle/skip karna ho toh bataiye.
