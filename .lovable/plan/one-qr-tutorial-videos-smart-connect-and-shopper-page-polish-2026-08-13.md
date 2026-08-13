# One QR: Tutorial Videos, Smart Connect, and Shopper Page Polish

Five things: admin-controlled tutorial videos on every editor sheet, a smarter Links/Connect experience, live preview sync, shopper-page layout/chat fixes, and a floating draggable "My Orders" button.

## 1. Tutorial video at the top of every config sheet

- Every bottom sheet opened from the editor dock (Colour, Theme, Links, Product, Videos, Setting) gets a responsive 16:9 video player pinned at the top, above its content.
- Player supports a YouTube/Shorts link (embedded) or an uploaded MP4 (native player). Collapsible — a shopkeeper can hide it with one tap and it stays hidden for that section on that device.
- If the admin has not set a video for a section, no player and no empty space appears.

### Admin control

- New **Tutorial Videos** panel inside the existing Admin → One QR Business page.
- One row per section (Colour, Theme, Links, Product, Videos, Settings, plus Business Profile and Landing Preview): title, short caption, YouTube URL field, MP4 upload button, active toggle, live test preview.
- Uploads go to backend storage; only admins can add/edit, everyone can read the active ones.

## 2. Links sheet: manual + Connect modes

Keeps every existing URL box (Instagram, Facebook, YouTube, X, WhatsApp, Google Business, website, payment, shop) and adds a **Connect** button on each platform row. Tapping Connect opens a small guided card with three ways to link:

- **Username** — type the handle (`@filtara.fashion`) and the correct profile URL is built automatically.
- **Paste link** — the current behaviour, now with validation ("this is a YouTube link, not an Instagram link") so the wrong-platform mix-up in the screenshot cannot be saved silently.
- **Phone** (WhatsApp only) — enter the 10-digit number, the `wa.me` link with a prefilled greeting is generated.
- Gmail/email row: enter the address, a `mailto:` link is generated for the Support drawer.

Each row shows a green **Connected** state with a "Test" button that opens the resolved link, so the merchant can confirm it works before saving. The structure is built so a real Meta/Google API authorization can be added per platform later without redoing the UI.

## 3. Live device preview sync

The centre phone preview refreshes the moment links, colour, theme, products, videos, or settings are saved — no manual reload button press needed. Saving a sheet pushes the change straight into the preview frame.

## 4. Shopper landing page (`/s/{code}`) layout fixes

- Remove the blank gap between the product rail and the yellow bottom dock, and tighten the gap inside the dock area so the row of yellow buttons sits close under the cards.
- Product cards resized to fit the frame cleanly: a fixed, slightly shorter card with the image contained (no awkward crop of faces/fabric), price, MRP, rating and the branded CTA all visible, ~3 cards across a 360px screen.
- Stats strip and Tag Karo pill spacing rebalanced so nothing overlaps the video or the dock.

## 5. Floating draggable "My Orders" button

- "My Orders" moves out of the side drawer into a compact floating pill on the landing page: shop-bag icon plus unread count, low opacity so the video stays visible, brightening on touch.
- Draggable anywhere on screen with a finger, snaps inside the safe area, and remembers its position on that device. Tapping it opens the orders/threads list.

## 6. Product-specific two-way chat

- "Inquiry" or "Order" on a product opens the chat thread for that exact product (already the case) — this pass makes the vendor side match.
- Vendor dashboard inbox gains a **Shop chats** list: one thread per product inquiry/order, with product thumbnail, name, quantity, shopper name/phone, last message and unread badge.
- Opening a thread shows the same WhatsApp-style bubble layout the customer sees, with a composer so the vendor can reply.
- Real-time both ways: a message from either side appears on the other screen immediately, and a new inquiry pops into the vendor inbox instantly.

## Technical notes

- New table `oneqr_tutorial_videos` (section key, title, caption, youtube_url, video_url, is_active) — public read of active rows, admin-only writes via `has_role`; MP4s in a public storage bucket with admin-only write policy.
- New `SheetVideoIntro.tsx` rendered inside `SheetShell` (so every editor sheet inherits it) plus `use-tutorial-videos.ts` for a cached fetch; `LandingProductsSheet`/`LandingMediaSheet`/`LandingExtrasSheet`/`MerchantLinksSetupSheet` pick up the section key.
- Admin panel added to `src/routes/admin.one-qr.tsx` as a new section with an upload handler through `media-upload.ts`.
- `MerchantLinksSetupSheet.tsx`: per-platform `ConnectRow` with mode switch, handle→URL builders and validators in a new `src/lib/social-link-connect.ts`.
- `LandingEditorSheet.tsx`/`LivePreviewFace.tsx`: bump the preview refresh key on every sheet `onSaved`, including links.
- `s.$code.tsx`: retune the bottom stack offsets (rail bottom padding vs dock height) to remove the gap; `LandingProductRail.tsx` card sized ~104x150 with `object-contain`-safe framing.
- New `LandingOrdersFab.tsx` using a framer-motion drag with position persisted in localStorage; the drawer row is removed.
- Vendor side: extend `shop_threads` reads with a merchant-scoped RPC (`shop_thread_list_for_merchant`, `shop_thread_messages_for_merchant`, `shop_thread_reply`), new `ShopChatsSheet.tsx` in the One QR dashboard, and a realtime hook on `shop_thread_messages` for both customer and vendor views.
