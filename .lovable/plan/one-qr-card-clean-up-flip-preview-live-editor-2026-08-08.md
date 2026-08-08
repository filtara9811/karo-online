# One QR card: clean-up + flip preview + live editor

## 1. Card cleanup (screenshot 1, red X items)
Remove from the project card entirely:
- The big green/orange "Preview & change theme" bar
- The "Landing page theme" row (already removed earlier — verify nothing remains)
- "Poster" and "Add campaign" buttons under it
- The bottom "Live customer preview" button

Result: card = banner + QR avatar + title + 4 stat tiles + analytics + visitor list. Nothing else.

## 2. Round preview icon next to the three dots
- Add a small round icon button (eye icon) in the card banner, immediately left of the "⋮" button, same size and glass style.
- Tapping it flips the whole card in 3D (existing flip-3d style) — the front (dashboard) rotates away and the back shows the live customer preview screen (screenshot 2 content).
- Flipping back via a close/back round button on the flipped face.
- Poster and campaign stay available inside the "⋮" menu, so nothing is lost.

## 3. QR avatar gets the same treatment
- Tapping the QR avatar keeps opening the QR, but the QR modal gains a "Live check" round button that switches straight into the same live-preview face, so QR and landing page can both be verified live.

## 4. Live preview editor (screenshot 2, red circle)
Inside the preview face, under the phone frame, one clean single-row toolbar:
- Brand colour — round swatch, opens native colour picker, applies instantly
- Theme — toggles the horizontal theme strip
- Links | add — opens link setup
- Product | add — opens product/link setup
- Videos | add — opens media setup

Every change re-renders the preview frame within a moment, so the merchant sees the customer view update live. Labels stay tiny under each round icon; clean white pill row, no clutter.

## Technical notes
- `src/components/oneqr/QrProjectCard.tsx`: remove the CTA block; add banner eye button; wrap card body in a flip container with the preview face on the back.
- `src/components/oneqr/ThemePreviewSheet.tsx`: reuse its phone-frame + toolbar as an embeddable preview face; drop Poster/Campaign chips, add Videos chip, keep live refresh on theme/accent change.
- No backend or schema changes.
