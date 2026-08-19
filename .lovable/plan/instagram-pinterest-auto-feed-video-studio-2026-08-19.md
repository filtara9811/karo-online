# Instagram + Pinterest Auto-feed (Video Studio)

## Meri sifarish (aapka sawal ka jawab)

**Instagram official API (Graph API)** merchant ke liye bahut bhaari hai: Instagram *Business/Creator* account + Facebook Page + Facebook App + App Review (`instagram_basic`, `pages_show_list`) chahiye, aur har merchant ko OAuth se connect karna padta hai. Pinterest official API v5 me bhi app approval + OAuth lagta hai. Iska matlab: aapke 90% chhote dukaandaar kabhi connect hi nahi kar payenge.

**Isliye: Phase 1 me RapidAPI (third-party scraper) — bas link paste, sync ho jaye.** Exactly YouTube jaisa UX, koi login nahi.
Phase 2 (baad me, optional): jo merchant Business account rakhta hai uske liye official OAuth connect — zyada reliable + legal, par approval ke baad.

RapidAPI par kaunsa lein:
- Instagram: ek "Instagram Scraper / Instagram Data" style API jisme `user reels` aur `user posts` by-username endpoint ho aur pagination cursor mile. Starter/paid tier (~$10–25/mo, 10k+ req) lein — free tier par rate-limit se feed rukta hai.
- Pinterest: "Pinterest Scraper / Pinterest Data" API — `user pins` / `board pins` by username ya board url, with bookmark/cursor pagination.
- Ek hi RapidAPI key dono ke liye chalegi (`RAPIDAPI_KEY`), host per-provider.
- Provider ko ek adapter ke peeche rakhenge, taaki koi API band ho jaye to sirf ek file badalni pade — app code nahi.

## Video Studio me kya dikhega

YouTube Auto-feed card ke neeche bilkul same design me do naye card:
- **INSTAGRAM AUTO-FEED** (gulaabi/purple accent) — toggle + input (`@handle`, profile link, ya reel/board link) + **Sync** button + last-sync status line ("18 reels mile").
- **PINTEREST AUTO-FEED** (laal accent) — toggle + input (username ya board URL) + **Sync**.
- Teeno feeds ek saath ON ho sakti hain (hybrid): pehle manually add kiye videos, phir YouTube, phir Instagram, phir Pinterest.
- Sync par error aaye to card me saaf message ("Private account hai" / "profile nahi mila"), silent fail nahi.
- Products tagging aise hi chalti rahegi — Instagram/Pinterest item ke apne id par mapping.

## Shopper landing page (/s/{code})

- Wahi snap-scroll reel feed. Instagram reels aur Pinterest video pins direct video URL se chalenge (`<video>`), image pins/posts image slide ki tarah.
- Infinite scroll: feed ke end ke paas next cursor page fetch, cache ke saath — YouTube jaisa hi.
- Kuch bhi na mile to feed sirf manual + YouTube dikhayega, koi khaali screen nahi.

## Technical plan

**Secret:** `RAPIDAPI_KEY` (approve karne ke baad `add_secret` se maangunga; aapko RapidAPI dashboard se copy karna hoga). Key sirf server par.

**Naye server files (key kabhi client bundle me nahi):**
- `src/lib/social-feed.server.ts` — provider adapters: `fetchInstagramPage(source, cursor, limit)`, `fetchPinterestPage(source, cursor, limit)`; handle/username/URL normalize; response ko ek common shape me map: `{ id, kind: "video" | "image", src, poster, title, cursor }`.
- `src/lib/social-feed-cache.server.ts` — `youtube-cache.server.ts` jaisa TTL cache (resolve 30 min, page 5–10 min) taaki RapidAPI quota bache.
- `src/lib/social-feed.functions.ts` — thin `createServerFn` wrappers `getInstagramFeed` / `getPinterestFeed`, Zod validated (`source` max 300, `cursor`, `limit<=30`), error par `{ ok:false, items:[] }` return (throw nahi).

**Client:**
- `src/components/landing/use-social-feed.ts` — `use-youtube-feed.ts` ka generalized version (provider prop), same `LandingMediaItem[]` + `loadMore()` API.
- `src/routes/s.$code.tsx` — do naye feed hooks, media list me YouTube ke baad concat, prefetch trigger me shaamil.
- `src/components/oneqr/LandingMediaSheet.tsx` — YouTube card ko ek reusable `AutoFeedCard` sub-component me nikaal kar teen baar use karna; save payload me naye fields.

**Storage (koi migration nahi):** `merchant_link_settings` ke JSON settings me nayi keys — `ig_source`, `ig_enabled`, `ig_products`, `pin_source`, `pin_enabled`, `pin_products` — existing `upsert_merchant_link_settings` RPC se hi save, aur `src/lib/landing-types.ts` me types add.

**Verification:** studio me dono links paste → Sync → publish → `/s/{code}` par Playwright se 360px width par feed scroll, next-page load aur product tap check.

## Note

Scraper APIs Instagram/Pinterest ke Terms ke hisaab se grey area hain aur kabhi-kabhi break hoti hain — isliye adapter pattern + Phase 2 official OAuth ka rasta khula rakha hai.
