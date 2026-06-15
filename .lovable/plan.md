## 🟢 Customer Side — Layered Draggable Bottom Sheets

### 1. VendorShopSheet (all-digital-shops → vendor-digital-shop)
- Replace current Radix `Sheet` with **Vaul drawer** (`bun add vaul`) — gives native draggable snap points.
- Snap points: `0.75` (default, ~75% — shows ~10% home peeking) and `0.97` (full).
- Fixed top bar: center drag handle (gold pill) + fixed **X button** top-right (always visible in both snaps).
- Action button on shop card renamed from "Inquiry" → vendor-configurable label (**"Shop Visit"** or **"Shop Now"**), read from `vendors.shop_cta_label` (new column, default `"Shop Visit"`).

### 2. ProductDetailSheet (vendor-digital-shop → product-details)
- Same Vaul drawer with same snap points (`0.75` / `0.97`), nested above VendorShopSheet so shop background peeks behind.
- Same drag handle + fixed X.
- **Book Now** → `/checkout?productId=...` (payment gateway, already wired to Cashfree/Razorpay).
- **Inquiry** → `/chat?productId=...&mode=inquiry` (already implemented — keep).

### Files
- `src/components/VendorShopSheet.tsx` — swap Sheet for Vaul Drawer with snap points
- `src/components/ProductDetailSheet.tsx` — same conversion
- `src/routes/vendors.tsx` — render dynamic CTA label from vendor record

---

## 🔵 Vendor Side — Architectural Separation

### 1. Dual-Mode Dashboard Landing
New route `src/routes/vendor.dashboard.tsx` redesigned as **two large hero cards**:
- 🟢 **Quick Service Dashboard** → existing leads/inbox flow (keep current `/vendor/dashboard` content under a `mode=quick` view)
- 🛍️ **Digital Shop Manager** → new route `/vendor/shop` (already exists — upgrade it)

Strict visual separation: different accent colors, different headers, no shared toggle.

### 2. Digital Shop Manager — Upgraded `vendor.shop.tsx`
Tabs inside the manager:
- **Catalog** (products list + add/edit)
- **Thumbnails** (NEW dedicated section — shop logo, banner, hero carousel, category thumbnails)
- **Storefront Preview** (live preview of customer view)
- **Settings** (CTA label "Shop Visit" vs "Shop Now", shop bio, hours)

### 3. Product Editor — Advanced Controls
Upgrade `src/components/ProductEditor.tsx`:
- **Status toggle**: Draft / Active / Inactive (stored in `catalog_items.status`)
- **Placement checkboxes**:
  - Recommended Products (bestseller row)
  - Shop Home Featured Grid
  - Normal Listing
  - Stored as columns: `is_recommended`, `is_featured_home`, `is_listed`
- **External Link field** (NEW): `external_url` — if set, product card redirects to that URL instead of opening detail sheet
- **Live Preview button** (eye icon) — opens `ProductDetailSheet` with current form data as a mock product
- **POS Inventory integration** — keep existing POS link to add/edit inventory items into shop catalog

### 4. Thumbnails Section (NEW)
Dedicated `src/components/ShopThumbnailsManager.tsx`:
- Shop avatar / logo upload
- Hero banner carousel (up to 5 images, reorderable)
- Category thumbnail overrides
- Featured collection cover
Uses existing `ShopMediaUploader` + Supabase storage.

---

## 🗄️ Database Migration

```sql
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS shop_cta_label text NOT NULL DEFAULT 'Shop Visit'
    CHECK (shop_cta_label IN ('Shop Visit','Shop Now')),
  ADD COLUMN IF NOT EXISTS shop_banner_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS shop_bio text;

ALTER TABLE public.catalog_items
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft','active','inactive')),
  ADD COLUMN IF NOT EXISTS is_recommended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_featured_home boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_listed boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS external_url text;
```
Customer-side queries filter `status = 'active'`.

---

## 📋 Build Order
1. Migration (vendors + catalog_items columns)
2. `bun add vaul`
3. Rebuild `VendorShopSheet` + `ProductDetailSheet` with Vaul snap drawers
4. Update `vendors.tsx` to use dynamic CTA label
5. Redesign `/vendor/dashboard` as dual-mode landing
6. Upgrade `/vendor/shop` with tabs (Catalog / Thumbnails / Preview / Settings)
7. Upgrade `ProductEditor` (status, placement, external link, live preview)
8. New `ShopThumbnailsManager` component

---

## ⚠️ Scope Note
This is a large change touching ~10 files + DB migration. Estimated 2-3 build turns. I'll do migration + customer-side draggable sheets first (most visible), then vendor-side in the next turn — unless you want everything in one shot.