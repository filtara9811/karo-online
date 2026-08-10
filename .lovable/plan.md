# Make QR shop pages open near-instantly

## Audit — what is actually slow today

I checked the shop route, the landing data function, and the database indexes. Four real problems:

1. **Nothing is rendered from the server.** `/s/$code` has no route loader. The browser must download JS, boot React, then call `get_public_landing`, then paint. On a slow 4G scan that is 2–5 seconds of grey skeleton. This is the single biggest cost.
2. **The code lookup does a full table scan.** `get_public_landing` matches `upper(code) = upper(...)` on `referral_codes`, and `upper(referral_code)` on `customers`. The existing indexes are on the raw columns, so the uppercase comparison cannot use them. Same for the "same-trade ads" query, which scans `vendors` with no supporting index and runs on every single scan even though it is below the fold.
3. **Images are served raw and full size.** Vendor avatars, covers and story media are loaded at original upload resolution with no width/quality/format parameters — a 2–4 MB phone photo can be the first thing the page downloads.
4. **No real caching.** Only a 5-minute `sessionStorage` copy exists, so a first scan on any device always pays full price; there is no HTTP/CDN caching of the landing payload at all.

## What I will change

### 1. Server-render the shop shell (biggest win)
- Add a public, cacheable server function that returns the landing payload, and call it from the route loader so the top bar (name, avatar, accent), theme colours and first media frame arrive in the HTML — no blank frame, no layout shift.
- Response gets CDN cache headers (short `s-maxage` + `stale-while-revalidate`) so repeat scans of the same shop are served from the edge without touching the database.
- Keep the client fetch only as a background refresh, so edits by the merchant still show up quickly.

### 2. Database indexing and a leaner query
- Add case-insensitive (functional) indexes for the code lookups on `referral_codes` and `customers`, plus an index supporting `qr_projects` slug lookups and the verified-vendor ads query.
- Split the below-the-fold "nearby shop ads" out of the critical payload so the first paint no longer waits on that scan; it loads after the page is interactive.

### 3. Image optimisation
- Route all merchant images (avatar, cover, story images, ad tiles) through a small helper that requests a resized, quality-capped, modern-format version sized to its slot (e.g. 96px avatar, ~720px story frame) instead of the original upload.
- `fetchpriority="high"` + a `preload` link for the first story frame; `loading="lazy"` and `decoding="async"` for everything below the fold (ads rail, banners, later media).
- Defer the heavier media viewer (video/reels player, animation library) until after first paint so the hero image is not queued behind it.

### 4. Perceived-instant skeleton
- Render the accent-coloured skeleton from server data (so it already matches the shop's brand colour) and cache the last-known name/icon/accent per code so a returning scanner sees the real header immediately.

## Deliverable
After the change I will re-measure and report: server response time for the landing payload, cold vs warm scan, and the first-paint timing, so you can see the before/after.

## Technical notes
- New public server fn (publishable-key client, no auth) called from the `/s/$code` loader; `errorComponent` / `notFoundComponent` stay.
- Migration: functional indexes `upper(code)` on `referral_codes`, `upper(referral_code)` on `customers`, `(user_id, slug)` coverage plus a partial index on `vendors (verified, trade)` for ads; optional split of ads into its own lightweight RPC.
- Image helper wraps Supabase storage render/transform parameters, with a pass-through for non-storage URLs.
