# Landing page: install button, bigger dock, theme preview + guide

## 1. Top bar: app download button (landing page)

In the merchant landing top bar, add a dedicated round **Install / App** button just left of the three-dots:

- Icon: download-in-phone icon, same glass style as the ⋮ button, label-free but with `aria-label="Install shop app"`.
- Tap behaviour:
  - install prompt available -> fire it directly (no sheet needed)
  - iOS -> open the options sheet with the "Share ▸ Add to Home Screen" hint
  - already installed -> show a small "Already installed" toast and hide the button
- The three-dots menu keeps the same install row, so both paths work.

## 2. Bottom category dock: bigger buttons

The pill dock got too thin. Increase to a comfortable tap size:

- Pill padding grows, each tile becomes ~48px tall with a larger icon (h-5) and always-visible short label under/next to the icon for the active item.
- Slightly taller container, keeps rounded gradient look and horizontal scroll.
- Page bottom spacer increased so content is not hidden behind the taller dock.

## 3. Theme preview screen (merchant side)

Today theme selection is an accordion inside each project card, plus a small "Live customer preview" iframe at the bottom — easy to miss. Add a proper **Theme Preview screen**:

- New full-screen sheet opened from a prominent "Preview & change theme" button on top of each project card (and from the card's ⋮ menu).
- Layout: phone-shaped frame in the middle rendering the real landing URL of that project, a horizontal theme strip below (Shop / Chat / Reels styles with PRO badges), and an "Apply to my customers" button.
- Tapping a theme applies it immediately and reloads the frame, so the merchant sees exactly what the customer will see.
- Frame refresh uses a cache-busting query param so the change is visible instantly.

## 4. Where is everything (guide)

Add a small **"Guide / Help"** sheet on the One QR dashboard (question-mark button in the header) explaining in Hinglish:

- Projects tab -> Create New Project / QR, each project card = one QR (Shop Gate, Counter, Table).
- Card ⋮ -> Change theme, Poster download, Links setup, QR image.
- Theme Preview -> choose one of 3 styles (Shop catalog / Chat WhatsApp-style / Reels full-screen video).
- Customer landing page -> top bar avatar = shop profile + "My details" form, new install button + ⋮ = PWA download of *that shop only*, middle = swipeable story media with sound, bottom dock = Social / Payment / Shop / Links.
- Free vs PRO: free = unlimited scans, visitor capture, 3 base themes, poster, CRM list. PRO = premium themes, ads campaigns, extra projects.

I will also spell out this same map in chat.

Note: the dashboard screenshot shows "Login karein phir project banayein" — the theme and PWA options only appear after merchant login, which is why they were not visible. The guide sheet will say this explicitly.

## Technical notes

- `src/components/landing/LandingTopBar.tsx`: new `onInstall` / `canInstall` / `installed` props; wired from `src/routes/s.$code.tsx` using the existing `useLandingInstall` hook.
- `src/components/landing/LandingCategoryDock.tsx`: dock sizing only (presentation).
- `src/components/oneqr/ThemePreviewSheet.tsx` (new): phone-frame iframe + theme strip; reuses `LandingTheme` type and the existing `onPatch({ theme_key, accent_color })` handler.
- `src/components/oneqr/QrProjectCard.tsx`: replace the inline accordion trigger with the preview sheet entry point (accordion can stay as fallback).
- `src/components/oneqr/OneQrGuideSheet.tsx` (new) + header button in `src/routes/one-qr.tsx`.
- No database or backend changes.
