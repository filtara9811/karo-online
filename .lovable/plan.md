# Fix: scanned QR opens generic page instead of the shop's feed

## What is actually broken (verified)

The QR link `/s/ASHU8380` reaches the correct route — the route file and metadata are fine. The failure is in the backend lookup that feeds it:

- Calling the landing lookup **without a project slug** (exactly what a scanned QR does) errors out with `record "_proj" is not assigned yet`. The page therefore receives an empty payload and falls back to the generic Karo Online cover, dock and stats — the screen in the screenshot.
- Calling it **with** a slug works, but resolves to whichever project the slug names even when that project has no shop content yet (`food-happy-...` returns 0 videos, 0 products), so it renders an empty shop.
- The shopper page reads `?p=` for analytics only. Its own data fetches (`get_public_landing`, `get_public_landing_stats`, `get_public_landing_contact`) never pass the project, and the server loader (`src/lib/landing.server.ts`) has no project argument at all — so even a correct `?p=` link is ignored for content.
- The merchant studio sheets (`LandingMediaSheet`, `LandingProductsSheet`, `LandingExtrasSheet`, `MerchantLinksSetupSheet`, `QrPosterSheet`) read shop settings with `user_id` + `maybeSingle()` and save without `project_slug`. With more than one project per user this reads the wrong row (and can error on multiple rows) and always writes into the oldest project. Same for the theme save in `/one-qr`, which calls `set_qr_landing_theme` without the project argument.

## The fix

### 1. Backend (one migration)

- Repair `get_public_landing` and `get_public_landing_stats` so the un-assigned record is initialised before it is tested — no-slug scans must work.
- Project resolution order: requested slug → the user's project that actually has shop settings/content → oldest project. This guarantees a bare QR scan lands on a populated shop instead of a blank one.
- Return the resolved project slug in the payload so the client can keep using it.

### 2. Shopper landing page (`src/routes/s.$code.tsx`)

- Declare `?p` as a validated route search param, pass it into the loader, and thread it through `getLandingPayload` → `landing.server.ts` → the lookup, so the shop's media and products are server-rendered.
- Pass the same project into the client refresh calls for landing, stats and contact.
- Keep everything else (reels feed, product sheets, chat, dock, install) as is; it already works once the payload is right.

### 3. Merchant studio project scoping

- Thread the active project slug from `/one-qr` into every studio sheet.
- Reads: filter shop settings by `user_id` + the project's id, ordered and limited (no bare `maybeSingle()` on multiple rows).
- Writes: include `project_slug` in the `upsert_merchant_link_settings` payload and pass the project to `set_qr_landing_theme`.
- Result: each project's videos, products, links, payment settings and theme stay independent.

### 4. Full verification (zero-error goal)

- Query the lookup for a code with and without a slug and for each project of a multi-project merchant; confirm correct media/product counts and no SQL error.
- Server-render `/s/CODE` and `/s/CODE?p=<slug>` and confirm the merchant's own image is preloaded rather than the default Karo cover.
- Drive the live preview to open a scanned shop link, check the video feed and products load, and confirm a clean browser console.
- Typecheck the changed files.

## Notes

- No UI redesign in this pass — this is a data-routing correctness fix so the existing shop UI shows the right shop.
- Remaining items from the previous round (scanner icon in the header, scan history, business dashboard modal, vendors marketplace list) stay queued and can follow once scanning lands correctly.
