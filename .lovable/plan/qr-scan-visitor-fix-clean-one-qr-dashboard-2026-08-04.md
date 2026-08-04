# QR Scan Visitor Fix + Clean One QR Dashboard

## 1. "Save nahi hua" error on QR scan popup (screenshot 1)

Confirmed root cause: the visitor-save function looks up the referral code in a column that does not exist any more (`customers.referral_code` / `vendors.referral_code`), so the call fails with a database error every time. Referral codes actually live in the `referral_codes` table.

Fix (migration):
- Rewrite `log_referral_visit_lead` to resolve the code owner from `referral_codes` (case-insensitive), falling back to no-owner instead of erroring.
- Apply the same fix to `log_referral_visit` (plain visit counter, currently broken the same way), so every scan is counted even when the visitor skips the popup.
- Keep the visit row saved even if the code owner can't be resolved, so no scan is lost.

After this, Submit saves name + mobile and the popup shows the success toast.

## 2. Remove the orange bottom dock everywhere except Home (screenshots 2 & 3)

- In `src/components/AppShell.tsx`, show `FloatingDockNav` only when the path is exactly `/` (Home). Remove it from the no-shell branch (public landing `/s/:code`, `/one-qr`, etc.), so the landing page's own "Continue with" buttons are fully visible and nothing is covered.

## 3. Clean the One QR dashboard header (screenshot 3)

- Add `/one-qr` to the routes that hide the app top header, so the Welcome / search bar / rating-review strip is gone.
- The dashboard keeps its own header row (back arrow, "One QR Business", Share QR) as the only top chrome, with correct top padding.

## 4. Visitor count + WhatsApp-style visitor list

- The dashboard already reads visits via `get_referral_visits`; once the save works, `Total / Today / 7 days / Leads` counts start filling in.
- Restyle the Visitors section as a WhatsApp-like list: avatar circle with the visitor's initial, name in bold, `+91 mobile` and relative time below, and Call / WhatsApp action buttons on the right. Newest visit on top, empty state kept when there are no scans.

## Technical notes

- One migration touching only the two logging functions; no schema/table change needed (`visitor_name` / `visitor_phone` columns already exist).
- Frontend edits: `src/components/AppShell.tsx` (dock + header rules) and `src/routes/one-qr.tsx` (visitor list UI, spacing).
- No change to the scan popup component itself beyond what the fixed function returns.
