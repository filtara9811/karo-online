# One QR: independent shops, QR scanner header, vendor marketplace

## 1. Every project becomes its own shop (full separation)

Today all shop data — theme, links, payment settings, products, videos, poster media — lives in a single row per user account, so a second project shows the first shop's content. Fix: make that data belong to the project, not the account.

- Shop settings row becomes per project (settings, links, payment, products, videos, poster media, theme + accent, YouTube sync).
- Existing data is attached to the user's **first** project; every newly created project starts completely empty (blank links, no products, no videos, default theme).
- Deleting a project deletes its own settings, products and media links only.
- Visitor/scan history and analytics are filtered by project, so each shop's numbers, visitor feed and inquiries are its own.
- Shopper landing page and digital shop resolve content from the scanned project (`/s/CODE?p=<project-slug>`), so scanning shop A's QR never shows shop B.
- The landing editor, links sheet, products sheet, videos sheet and POS all read/write the currently selected project.

## 2. Header and navigation

- The bell icon is replaced with a **QR Scanner** icon. Tapping it opens the device camera in a scan sheet:
  - Karo shop codes/links open that shop's landing page in-app.
  - Any other QR opens the scanned link (with a confirm step for external URLs).
  - Every scan is saved with time, decoded value and shop name.
- New **Scan History** screen (reachable from the grid/hub menu) listing all previous scans with timestamps, with tap-to-reopen.
- The avatar button no longer navigates back. It opens a **Business Dashboard** sheet styled like the existing install/share sheet, with: Install app (PWA), Copy link, Share, and Download business dashboard (saves a summary/report image of the current project). Back to home moves into that sheet.

## 3. Vendors tab = public marketplace

- Vendors tab becomes a scrollable list of **all shops in the system that have a live landing page** (any project, free or paid), not just one sponsored card.
- Sticky search bar at the top filters shops by name (and category) as you type.
- Each row shows cover/logo, shop name, category, rating/distance when available, and a **Shop Now** button that opens that shop's landing page / short-video feed.
- Sponsored shops still appear pinned at the top of the list.
- My Project stays the private workspace; Vendors is public discovery.

## 4. Motion and polish

- Tab switches, sheets and the scanner use the same spring transitions already used across One QR, so nothing snaps.

## Technical notes

- Migration: add `project_id` to `merchant_link_settings` (FK → `qr_projects`, unique per user+project), backfill each existing row to the user's oldest project, and update `upsert_merchant_link_settings` + `get_public_landing` / `get_public_landing_stats` to take an optional project slug and resolve settings by project. New project creation inserts a fresh empty settings row instead of inheriting.
- Analytics: `get_qr_dashboard_analytics`, `get_qr_visitor_feed` and `get_referral_visits` gain an optional project-slug filter; visit logging writes `project_slug` from the active project.
- New public RPC `list_public_shops(_q, _limit, _offset)` returning active projects with cover, name, category and landing URL (anon SELECT, safe columns only) for the Vendors marketplace.
- New table `qr_scan_history` (user, decoded value, resolved shop, created_at) with owner-only RLS + grants for the Scan History page.
- Frontend: `src/routes/one-qr.tsx` header swap + new `QrScannerSheet`, `ScanHistorySheet`, `BusinessDashboardSheet`, and a rewritten Vendors tab (`VendorsMarketplace`) with search; project-scoped props threaded into existing sheets.
- Camera scanning uses a lightweight browser barcode/QR decoder with a graceful fallback message when camera access is denied.
