# Buttery-smooth reel feed, audio control, image fix

Priority 1 is the shopper landing page (`/s/{code}`) experience. The roadmap items are scoped after that.

## 1. Full-screen native snap feed

Today the reel viewer paints one item at a time and moves between them with a framer-motion drag gesture. That is why swiping feels "forceful" and dies over YouTube iframes: the iframe swallows the pointer, so the gesture never reaches the drag handler.

Rework the media viewer into a real scroll container:

- One full-height slide per media item, stacked in a vertically scrolling container with mandatory snap and hidden scrollbars.
- `touch-action: pan-y` and `overscroll-behavior: contain` on the container, so a vertical swipe starting anywhere — over the video, over the product cards' empty space, over the overlays — scrolls the feed. Horizontal gestures stay owned by the product carousel.
- Track the visible slide with an IntersectionObserver instead of drag offsets, and report it upward (drives product rail, analytics, YouTube load-more).
- Infinite loop: when the viewer reaches the last slide, jump back to the first slide silently (no visible scroll animation), keeping the "never stops" behaviour we have today.
- Only render players for the active slide and its immediate neighbours; other slides show their poster frame. Keeps memory and network flat with a long YouTube feed.

## 2. Player touch + tap control

- A transparent tap layer sits above every player (native `<video>` and YouTube iframe alike). It handles tap-to-pause / press-and-hold, and it does not block vertical scroll because the container owns `pan-y`.
- The iframe itself becomes non-interactive (`pointer-events: none`) so YouTube's own controls and replay overlay can never intercept a swipe.

## 3. Single audio owner

- One controller decides which slide may play sound. On every active-index change: pause and mute every non-active native video, and remount the non-active YouTube frames muted/idle.
- The mute toggle stays a per-viewer preference and applies to whichever slide is currently active.

## 4. Product thumbnail image fix

Fixed-height, overflow-hidden thumbnail frames with `object-fit: cover; object-position: center` for all product imagery — the horizontal rail (both card and wide variants), the "See All" catalog grid, and the product detail sheet. Adds a shared thumbnail utility so all three stay consistent, and stops the stretched/squashed images visible in the screenshots.

## Roadmap (not built in this pass)

### Instagram media feed
Instagram has no public read API. It requires the Instagram Graph API with a Business/Creator account linked to a Facebook Page, a Meta app, and per-merchant OAuth (`instagram_basic`) with long-lived token refresh plus App Review approval. Practically this is the same shape as the YouTube sync we just shipped, but each merchant must connect their own account. Recommend doing it after the paid-plan work, since App Review takes weeks.

### Product URL scraper
A server function takes a pasted product URL, fetches the page, and reads Open Graph / JSON-LD `Product` metadata (title, price, image, description) — no headless browser, so it works in our runtime. Fills the product form for the merchant to confirm before saving. Amazon/Flipkart aggressively block bots, so it will be best-effort with manual fallback; results get cached per URL.

### Dynamic pricing admin
An admin settings page backed by a new plan-config table (plan key, price, currency, limits such as video slots and product count, active flag). Razorpay checkout and every limit check read from that table instead of hard-coded numbers, so prices and limits change without a deploy.

## Technical notes

- Rewrite `src/components/landing/LandingStoryMedia.tsx` as a snap scroller (`useRef` container + IntersectionObserver + per-slide player component), keeping its current props (`media`, `initialIndex`, `onIndexChange`, `accent`, `children`) so `src/routes/s.$code.tsx` needs no logic change.
- Overlay children (top bar, stats, product rail, dock) stay fixed above the scroller as they are now, so they don't scroll away.
- Thumbnail styling: add shared classes in `src/styles.css` and apply in `LandingProductRail.tsx`, `LandingAllProductsSheet.tsx`, `LandingProductSheet.tsx`.
- No database or backend changes in this pass.
