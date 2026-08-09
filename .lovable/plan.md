# Dynamic white-label PWA install for merchant shops

Each shop link (`/s/<code>` with optional `?p=<project>`) becomes its own installable mini-app: the vendor's business name under the icon, their profile picture as the icon, and launch straight into their storefront.

## What changes for the customer

1. Opening a shop link (~1.5s after load) shows a premium animated popup: shop logo, "Install <Business Name>", animated progress/pulse, Install + "Not now". Shown once per shop per browser (remembered), skipped when already installed or when running as an installed app. iPhone gets the Share → Add to Home Screen steps instead.
2. Tapping Install (popup or the top-bar App button) fires the real browser install prompt; on success the button flips to "Installed".
3. The home-screen icon shows the vendor's profile picture and the vendor's business name; opening it launches that shop only.

## Current gaps found

- The dynamic manifest already exists at `/api/public/manifest/<code>`, but it reads name/icon from the `customers` table and ignores the selected project (`?p=`), so a shop shows the generic platform name/letter icon instead of the project's business name.
- The manifest's icon entries point at the raw avatar URL with hardcoded `192x192`/`512x512` sizes and fall back to the Karo icons, so phones often install the platform icon.
- There is no install popup on the landing page — install is only reachable from the top-bar button.

## Technical plan

**1. `src/routes/api.public.manifest.$code.ts` — project-aware manifest**
- Resolve the project first: when `p` is present, look up `qr_projects` by `id` (or `slug`) using the admin client and read `business_name` (fallback `title`), `avatar_url`, `accent_color`; otherwise fall back to the user's primary project for that shop code, then to the existing `customers` lookup.
- `name` / `short_name` = business name; `description` = "<name> — digital shop"; `theme_color` = project accent (query `accent` still honoured).
- `start_url`, `id`, `scope` stay pinned to `/s/<code>` (+ `?p=`), `display: standalone` — already correct.
- `icons` point at a new same-origin icon endpoint (below) at 192 and 512, `purpose: "any maskable"`, with the Karo icons kept only as a last-resort fallback when the vendor has no picture.

**2. New `src/routes/api.public.shop-icon.$code.ts`** — same-origin icon proxy: fetches the vendor's `avatar_url` server-side, streams it back with an `image/png|jpeg` content type and cache headers, and redirects to `/icon-512.png` when missing/unfetchable. Needed because cross-origin storage URLs with mismatched declared sizes are frequently rejected for the home-screen icon.

**3. `src/components/landing/use-landing-install.ts`** — pass the resolved project id through to the manifest URL, expose `promptReady`, and add a `dismissed`/`seen` helper backed by `localStorage` keyed by shop code so the popup shows once.

**4. New `src/components/landing/LandingInstallPrompt.tsx`** — framer-motion bottom-sheet popup styled with the shop accent: logo tile with pulse/shine, business name, benefit lines, animated install progress bar on tap, success state, iOS instructions variant, "Not now" dismiss.

**5. `src/routes/s.$code.tsx`** — render the popup, gate it on `!installed && !standalone && !seen`, feed it the resolved shop name/avatar/accent, and keep firing the existing `PWA_INSTALL` analytics event on success.

No database or schema changes are needed.

## Note

Android/Chrome installs use the dynamic manifest as described. iOS Safari has no install API and always uses Share → Add to Home Screen; it picks up the shop name but uses the apple-touch-icon, so the popup shows guided steps there instead of a one-tap install.
