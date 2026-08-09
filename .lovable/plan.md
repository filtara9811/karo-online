# One QR — Selected Project Bar + Referral Button Tap Fix

## 1. Top bar becomes the selected project bar (single selection)

The orange "Create New Project / QR" bar on the One QR home screen turns into a
selected-project bar, exactly like the marked screenshot:

- Left: the selected project's logo in a round tile.
- Middle: project name, and under it two small pills — "Available credit" (wallet
  balance) and "Recharge" (opens the add-funds flow).
- Right: a round chevron button that opens the same bottom sheet as today.
- Tapping "Recharge" opens the wallet top-up sheet directly, not the picker.

Selection becomes **single-select**: choosing a project in the sheet replaces the
current one and closes the sheet, so only one project card is shown on Home.
The sheet keeps the "New project — ₹599" button and the free-first-project rule
unchanged.

When no project exists yet, the bar falls back to today's "Create New Project /
QR" call to action.

## 2. Referral floating button does not respond to tap

The button currently opens its share sheet from a pointer-up handler paired with
the long-press timer, which is why a normal tap can be swallowed. It will use a
plain click handler to open the share sheet, with long-press-to-copy handled
separately so it no longer blocks the tap. Its stacking layer is also raised
above the One QR bottom pill nav so it stays tappable on that screen.

## Technical notes

- `src/routes/one-qr.tsx`: replace the create-project button block with a
  `SelectedProjectBar`, keep `pickerOpen` for the chevron, and change
  `persistSelected` usage so toggling stores a single id (`[id]`). Wallet balance
  comes from the data already loaded for the hub sheet; Recharge reuses the
  existing wallet/top-up entry point used by `OneQrHubSheet`.
- `src/components/oneqr/ProjectPickerSheet.tsx`: single-select visuals (radio-
  style check), `onToggle` selects and closes.
- `src/components/referral/ReferralFloatingButton.tsx`: `onClick` opens the
  sheet; long-press copy uses pointer down/up with a `didLongPress` flag; z-index
  raised above `z-40` navs.
- No schema, RLS, or payment-logic changes.
