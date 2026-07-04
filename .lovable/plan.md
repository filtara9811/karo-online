## Goal

Customer registration ke baad ek naya **role-choice screen** (screenshot 2 style) add karna, aur "Become a Seller" pe click karne pe ek naya **Vendor Joining flow** (screenshot 1 style — one screen + 6 bottom sheets) chalana. Purana vendor register flow hata dena.

---

## Flow (naya)

```text
Mobile → OTP → Basic Details form → [NEW: Role Choice screen]
                                          ├── "Continue as Buyer"  → /quick (home)
                                          └── "Become a Seller"    → /vendor/join (naya)
```

`/vendor/join` ke andar screenshot 1 wala pattern:

```text
┌─ Vendor Joining (One Screen)
│  Progress: Location · Photos · Business · Services · Products · Review
│
│  6 rows (tap = bottom sheet khulti hai):
│    1. Business Location   → map + radius (5/10/20/Custom KM)
│    2. Profile & Photos    → profile / shop / cover / gallery / intro video
│    3. Contact Details     → mobile, whatsapp, email, preferred call
│    4. Business Info       → shop name, type, experience, hours, GST
│    5. Services            → search + popular categories, multi-select chips
│    6. Products (Optional) → category, name, price, description, add more
│
│  Bottom: "Submit & Get Started" → Review sheet → dashboard
└─
```

Har row filled ho jaane pe green tick + progress % update.

---

## Files (changes)

**New**
- `src/components/RoleChoiceScreen.tsx` — screenshot 2 layout (map hero image, "Continue as Buyer" / "Become a Seller" cards, trust footer)
- `src/components/vendor-join/VendorJoinFlow.tsx` — one-screen hub with 6 rows + progress bar
- `src/components/vendor-join/sheets/LocationSheet.tsx`
- `src/components/vendor-join/sheets/PhotosSheet.tsx`
- `src/components/vendor-join/sheets/ContactSheet.tsx`
- `src/components/vendor-join/sheets/BusinessInfoSheet.tsx`
- `src/components/vendor-join/sheets/ServicesSheet.tsx`
- `src/components/vendor-join/sheets/ProductsSheet.tsx`
- `src/components/vendor-join/sheets/ReviewSheet.tsx`
- `src/components/vendor-join/useVendorDraft.ts` — local draft state (localStorage persistence)
- `src/routes/vendor.join.tsx` — mounts `VendorJoinFlow`, on submit → save to Supabase (`vendors`, `vendor_services`, `vendor_products`) → redirect `/vendor/dashboard`

**Edited**
- `src/components/RegistrationFlow.tsx` — final step (baad customer save hone ke) `onComplete` ki jagah pehle RoleChoiceScreen render kare; buyer → parent onComplete, seller → `navigate("/vendor/join")`
- `src/routes/register.tsx` — role-choice ke baad routing (no functional change, RegistrationFlow ke andar hi hoga)
- `src/components/AuthGate.tsx` — force-gate ke complete callback role-choice ke baad hi fire ho
- `src/routeTree.gen.ts` — auto (naya route add hoga)

**Deprecated (removed)**
- `src/routes/vendor.register.tsx` — purana multi-step vendor register. `/vendor/register` ko `/vendor/join` pe redirect kar denge (existing "Join Business" CTA in `VendorModeToggle` ko bhi update).

---

## Data model (backend)

`vendors` table already exists — usi mein save karenge. Naye optional columns (agar missing) ke liye ek migration:

```sql
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS gallery_urls   text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS intro_video_url text,
  ADD COLUMN IF NOT EXISTS working_hours  jsonb,
  ADD COLUMN IF NOT EXISTS lead_preferences jsonb;
```

Services/products existing tables mein hi jayenge. Grants/RLS already in place — check aur update if needed.

---

## UI / design

- Same warm gold + off-white palette (existing tokens `oklch(0.78 0.14 82)` etc.) — screenshot 1 se match karta hai.
- Bottom sheets: rounded top corners, drag handle, ~85–90% height (existing `SearchOverlay` pattern reuse).
- Progress dots + labels on top (Location / Photos / Business / Services / Products / Review) with amber active state.
- Green tick chips on completed rows; disabled "Submit & Get Started" until required rows done (Location + Business + Services + at least Contact).

---

## Out of scope (is turn)

- Payment / activation fee (already stubbed in `registration-backend.functions.ts` — leave as-is)
- KYC docs upload (existing `KycStepFlow` untouched, will be prompted post-onboarding as before)
- Admin approval flow — same as current

---

## Verification

1. Manual: `/register` complete → role screen → Buyer → `/quick` ✓
2. `/register` complete → Seller → `/vendor/join` → fill 6 sheets → submit → `/vendor/dashboard`
3. `/vendor/register` → redirects to `/vendor/join`
4. Playwright smoke: open `/register`, mock session, verify role screen renders with both CTAs.