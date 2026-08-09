# One QR — Project Picker, Clean Card Container, Smart Visitor List

## 1. Create Project button becomes a project picker + paid slots

Tapping the orange "Create New Project / QR" bar opens a bottom sheet instead of instantly creating a project:

- Top row: all existing projects as round chips (1, 2, 3 …) with logo + name. Tap to toggle selection.
- Whatever is selected is what shows on the Home screen. Select one project → one card; select three → three cards. Selection is remembered on the device.
- "New project" button at the bottom:
  - Project 1 is free.
  - Project 2 and beyond cost ₹599 each. A short details form is required first: project name, business name, mobile, category, profile picture, cover image.
  - After the form, payment goes through the existing Cashfree checkout (same flow the wallet uses). The project is only created after payment is verified; on cancel/failure nothing is created and the money path stays untouched.
  - The free first project also asks for the same basic details (no payment).

## 2. Card container split

The project card container keeps only: cover image, logo + business name/email, and the four tiles (QR | visitor, Add campaign, My landing page, Add | link).

QR analytics, ad-budget input and the visitor list move **outside** the card into their own separate blocks below it, each in a light section of its own so the card looks clean.

## 3. Visitor list — one row per number, WhatsApp-style

- Rows are grouped by phone number (visitors with no number group by device/session). One number = one row, showing the latest visit time.
- A repeat visit does not add a new row; instead the row shows a green unread badge on the right with the count of new visits since you last opened that chat, exactly like WhatsApp, and jumps to the top of the list.
- Opening the visitor chat clears the badge for that visitor.
- Row keeps Call and WhatsApp buttons.

## Technical notes

- Grouping/dedupe is done in the dashboard code over the visits already fetched (`get_referral_visits`), so no schema change for the list itself; last-opened timestamps per visitor are stored locally.
- Selected project ids and per-visitor "last seen" markers persist in localStorage.
- New paid-project flow reuses `createCashfreeOrder` / `verifyCashfreeOrder`; project row is inserted into `qr_projects` after verification, with the form details saved to the vendor profile fields already used by the card.
- A small migration adds a `paid` / `price_inr` marker column on `qr_projects` so free vs paid slots are auditable (with GRANTs, RLS unchanged).
- New files: `src/components/oneqr/ProjectPickerSheet.tsx` (chips + selection + new-project entry) and `src/components/oneqr/NewProjectSheet.tsx` (details form + payment). `src/routes/one-qr.tsx` and `QrProjectCard.tsx` are updated for the container split and filtered rendering; visitor grouping lives in a small helper next to `VisitorChatSheet.tsx`.
