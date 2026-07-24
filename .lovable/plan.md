
## Problem

In `src/components/FindingVendorOverlay.tsx` the sheet renders, top-to-bottom:
drag handle → progress bar → header row → title strip → radar block
(82–300px) → "vendors live" card / approved-vendor strip → chat thread.

On a 360×691 viewport that stack eats ~55–60% of the 96dvh sheet before the
chat starts, so `LeadChatThread` renders in a short window near the bottom.
That's the "chat pushed down" the user is reporting. The chat itself already
uses `h-full min-h-0` correctly — the issue is purely the chrome above it.

## Goal

Once the chat is active (first vendor accepted, or after approval), the
`LeadChatThread` must sit directly under a single slim header row and fill
all remaining height, on every screen size, with no layout shift when
vendors keep arriving or when approval happens.

## Changes (UI only, `src/components/FindingVendorOverlay.tsx`)

1. **Grow the sheet to full height when chat is live.**
   Keep `96dvh` only while searching with zero vendors. Once
   `vendors.length > 0`, switch the outer `motion.div` to
   `height: 100dvh; max-height: 100dvh` and drop the top rounded corners
   into a smaller radius so it reads as a full-screen chat, matching the
   reference screenshots.

2. **Merge the top chrome into one 44px row once vendors exist.**
   While `vendors.length > 0`:
   - Hide the standalone progress bar, header row ("✦ Finding ✦ …"), and
     title strip.
   - Render one compact top bar containing: back/close button, category
     thumbnail + name, live counter (`3/5`) or `✓ Completed`, and the
     small pulsing radar dot already in the title strip.
   - Keep the drag handle only in the zero-vendor state.

3. **Collapse the radar block into the top bar.**
   Remove the dedicated `h-[82px]` / `h-[38px]` radar container once
   vendors exist. The 20px pulsing badge already living in the compact
   top bar is enough of a "still searching" cue. The full 300px radar
   only renders in the initial zero-vendor state.

4. **Turn the vendor rail into a slim horizontal strip above the chat.**
   Replace the current "Vendors live aa rahe hain" card + approved-vendor
   card with a single 72px horizontal scroller of avatar chips (same data,
   same tap-to-switch behaviour, approved vendor gets a green ring and
   pins to the left). No card padding, no call button in this strip — the
   call action stays inside `LeadChatThread`'s own header.

5. **Give the chat the remaining space.**
   Wrap the chat in `<div class="flex-1 min-h-0">` directly after the
   avatar strip, no extra padding, so `LeadChatThread` with `embedded`
   fills 100% of the leftover height. This is what actually fixes "chat
   pushed down" — after steps 2–4 the leftover is the whole screen minus
   ~44px top bar and ~72px avatar strip.

6. **Preserve existing states.**
   - `noVendorsFinal` fallback still renders in place of the chat region.
   - Approved state: other avatars fade to 40% opacity but stay in the
     strip so the user can still tap; the tab switcher (Chat / Order
     Status) stays where it is inside `LeadChatThread`'s embedded view.
   - `onClose` still fires from the top-bar X and from the backdrop tap
     in the zero-vendor state; once chat is live the backdrop is not
     clickable (sheet is full-screen).

## Out of scope

- No backend, RPC, or data changes.
- No changes to `LeadChatThread.tsx`, `LeadOrderStatusPanel.tsx`, or the
  auto-match logic — the embedded chat already handles its own scrolling
  correctly once given full height.
- No visual redesign of the chat bubbles or vendor cards themselves.

## Verification

- 360×691 (current preview), 390×844, and 412×915: after first vendor
  accepts, chat header sits ≤120px from the top and message list
  scrolls to the bottom safe-area inset.
- Approving a vendor does not change the chat's top offset (no jump).
- Zero-vendor searching state still shows the full radar and progress
  bar as today.
