# Per-project identity + Vendors marketplace

## 1. Every project is its own shop (frontend)

Right now the selected project's card and studio sheets still fall back to the account-level vendor profile, so a second shop shows the first shop's name, logo, cover and contact. Fix the frontend so the active project is the only source of truth:

- The project card header (logo, cover, shop name, phone/subtitle) reads only the selected project's own fields — no fallback to the account vendor row.
- Tapping the identity area opens a **project** business profile form (shop name, phone, category, address, logo, cover) that saves onto the selected project, not the account.
- New projects therefore start with a blank identity that the merchant fills in per shop.
- The header subtitle shows the selected project's shop name.
- Every studio sheet gets the selected project's slug: Products, Media/Videos, Extras, Links (also when opened from the Services sheet), Theme, QR Poster, QR Code and Digital Shop / POS. Switching projects re-fetches that project's data; saves never touch another shop's row.
- Sheets remount when the active project changes, so stale products/videos from the previous shop can't linger.

## 2. Vendors tab = public marketplace

- Replaces the single "Nearby sponsored vendors" block.
- Sticky search bar at the top, filtering all shops by name (and category) as you type.
- Vertical scrollable feed of **all active shops in the system** (every merchant project with a live landing page), sponsored ones pinned on top with a small badge.
- Each card: cover/logo, shop name, category, rating chip, and a **Shop Visit** button that opens exactly that shop's short-video landing page (`/s/CODE?p=<shop-slug>`).
- Loads in pages as you scroll; clean empty and loading states.
- Removes the blank white gap under the last card (screenshot 4).

## Technical notes

- `src/routes/one-qr.tsx`: derive a single `activeProject`; pass `projectSlug={activeProject.slug}` (and `key={activeProject.id}`) to `LandingEditorSheet`, `MerchantLinksSetupSheet`, `QrPosterSheet`, `QrCodeSheet` and the nested products/media/extras sheets; stop passing the account `profile` fallback into `QrProjectCard`.
- `QrProjectCard.tsx`: drop `profile?.…` fallbacks for cover/avatar/name/bio.
- New `ProjectIdentitySheet` (or a `project` mode on `BusinessProfileSheet`) writing `business_name`, `contact_phone`, `category`, `avatar_url`, `cover_image_url` (+ address into the project's landing settings) via the existing `qr_projects` update path already used by `patchProject`.
- New `src/components/oneqr/VendorsMarketplace.tsx` calling the existing `list_public_shops(_q, _limit, _offset)` RPC (returns jsonb rows: `code`, `slug`, `name`, `category`, `avatar_url`, `cover_image_url`, `sponsored`), debounced search, infinite scroll, `Shop Visit` → `/s/{code}?p={slug}`.
- No database migration needed — the project-scoped RPCs and `list_public_shops` already exist.
