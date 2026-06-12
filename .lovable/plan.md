## What you'll get

This plan covers the `/quick` (customer home) screen tweaks you marked, plus finishing the Search Console + LCP items left over from SEO.

### 1. Top-right "Join Business / Vendor On-Off" pill (`/quick`)
- Replace the current "Join Business" button with a smart pill:
  - **New users (no vendor profile):** shows `🏪 Join Business` → opens vendor registration.
  - **Existing vendors:** shows an `ON / OFF` slide toggle labelled `Vendor`.
    - Sliding **ON** → animates and routes to `/vendor/dashboard` (customer → vendor mode).
    - On the vendor dashboard, the same pill appears top-right showing **ON**; sliding **OFF** → routes back to `/quick` (vendor → customer mode).
- State is detected by querying the `vendors` table for the signed-in user (cached locally so the pill renders instantly).

### 2. My Orders icon next to the search bar
- Move the "My Orders" entry out of the side menu (`VendorSideMenu` / profile menu).
- Add a small circular icon button **just left of the search bar** on `/quick` (where the package-refresh icon currently sits — replace that with a proper Orders icon that routes to `/orders`).
- Show a tiny gold dot when there are active orders.

### 3. "Find Vendor" button on the selected category card
- In the sub-category list (the cards that currently get the orange ring when tapped), when a card becomes `selected`:
  - Show a small pill button in the **top-right corner of that card only**, label `Find Vendor →`, gold gradient.
  - Tapping it triggers the existing "find vendor" flow (same action as the current bottom CTA), so users don't have to scroll.
- Unselected cards do not show the button.

### 4. Side menu cleanup
- Remove "My Orders" from `VendorSideMenu` / customer side menu since it's now in the header.

### 5. Google Search Console verification
- Generate a META verification token for `https://karoonline.in/` via the Search Console connector.
- Inject the `<meta name="google-site-verification" …>` tag into `src/routes/__root.tsx` head.
- Call the verify endpoint, then add the site to Search Console so it appears in your property list.
- Submit `https://karoonline.in/sitemap.xml` to Search Console.

### 6. Lighthouse LCP
- Run Lighthouse against the **published** site (`https://karoonline.in`) after the above ships.
- Report the LCP number + the single biggest fix (likely: preload the hero image / dim the hero gradient layer / mark hero `<img>` as `fetchpriority="high"`).
- Apply that one fix in the same turn.

## Technical notes

- Vendor-mode detection: `supabase.from('vendors').select('id,status').eq('user_id', user.id).maybeSingle()` — cache in `localStorage` under `ko-vendor-mode-v1` for instant render.
- The on/off pill is a single shared component (`VendorModeToggle`) reused on `/quick` and `/vendor/dashboard`.
- "Find Vendor" button reuses the existing `onPickItem` handler that already drives the bottom CTA — no new business logic.
- Search Console: META method only (DNS/file upload not available on Lovable hosting).

## Out of scope

- No changes to the vendor dashboard layout itself — only the top-right pill is added.
- No changes to the orders list page.
- No backend schema changes.

Reply **"go"** (or edit any step) and I'll switch to build mode and ship it.