# One QR: clean dashboard, 4-tile card, bottom pill nav

## 1. Top bar cleanup
- Remove the "My project / All sponsored ads" segmented toggle and the help (?) button from the header.
- Keep: back/avatar button, screen title, and the notification bell (with badge) on the right.
- The sponsored-ads content moves out of the top bar into the new pill nav (Ads tab). Help/guide stays reachable from the project card's ⋮ menu.

## 2. Project card = 4 tiles only (screenshot)
Card keeps: banner + shop avatar + business name/tagline, then one row of exactly 4 round-icon tiles:

| Tile | Tap action |
| --- | --- |
| QR \| visitor (count) | Opens the QR bottom sheet — big QR, share, poster, download, and QR editing (the existing QR modal content, moved into a bottom sheet) |
| Add campaign (count) | Opens the existing Ad services / campaign sheet |
| My landing page (gear) | Opens the live customer preview with the editor toolbar (theme, brand colour, links, products, videos) — changes reflect instantly in the preview |
| Add \| link | Opens the merchant links setup sheet |

Removed from the card: the green eye/preview button in the banner, the stats pill row duplication, and any leftover CTA rows. Below the tiles stay the analytics strip and the WhatsApp-style visitor list, unchanged.

The landing-page editor stops being a card flip and becomes a full-height bottom sheet (easier to scroll, no clipped 3D face). Preview phone frame on top, single clean toolbar row underneath.

## 3. Bottom pill navigation
One black rounded pill fixed at the bottom, replacing the current 4-tab white bar:
- Left half: **My Project** — the project list (default).
- Right half: **Vendors | Ads** — two segments: *Vendors* (nearby sponsored vendor cards) and *Ads* (ads manager: per-project budget, ON/OFF, clicks).
- Tapping the pill's centre opens a bottom sheet with:
  - **My Wallet** — balance + add fund for campaigns
  - **Business profile** — logo/cover upload, business name, tagline

CRM stats stay available inside the project card and the Vendors/Ads views; no separate CRM/Settings tabs.

## Technical notes
- `src/routes/one-qr.tsx`: drop `Tab` union to `"projects" | "vendors" | "ads"`, remove header segmented control + guide button, replace `TabBtn` bar with a new `OneQrBottomPill` component, add wallet/profile sheet state.
- `src/components/oneqr/QrProjectCard.tsx`: remove flip container, banner eye button and QR modal; render 4 tiles wired to `onQr`, `onCampaign`, `onPreview`, `onLinks` callbacks.
- New `src/components/oneqr/QrCodeSheet.tsx` (QR + share/poster) and `src/components/oneqr/LandingEditorSheet.tsx` (reuses `LivePreviewFace` toolbar inside a bottom sheet).
- New `src/components/oneqr/OneQrHubSheet.tsx` for My Wallet + Business profile. Wallet reads existing vendor wallet data; profile edits existing vendor fields.
- No schema changes; wallet/profile use existing tables and RPCs.
