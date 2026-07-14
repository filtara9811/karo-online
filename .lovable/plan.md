## Smart Scanner v3.1 — Fixes & Auto Category Mapping

Aapke screenshots aur feedback ke basis par 4 problems fix karne hain + 1 naya flow. Sab kuch existing stack pe (Google Maps connector + Lovable AI + Supabase) — koi nayi API key nahi chahiye.

---

### 1. Map "Location detect nahi hui" fix (Screenshot 1)

**Problem:** Runtime error `i.maps.Map is not a constructor` — Google Maps JS script async load ho raha hai lekin `Marker`/`Map` constructor available hone se pehle use ho raha hai. Isliye pin blank dikh raha hai, address hone ke bawajood.

**Fix (`MapPinPreview.tsx`):**
- `loadMapsScript()` me `libraries=marker,places` add karein aur `google.maps.importLibrary("maps")` + `importLibrary("marker")` await karein (async loading ka correct pattern).
- Fallback geocoding: agar `geocodeFn` fail ho, to `pincode + city + state` se retry karein (aksar full address me Hindi/mixed script hoti hai jise Google reject karta hai).
- Agar phir bhi fail ho → India Post pincode API se lat/lng approximate karein (already available flow).
- Map ready hone par auto-confirm pin (user ko manually "Confirm" tap na karna pade jab tak drag na ho).
- Save hone par vendor row me `lat`, `lng`, `google_maps_url` (`https://www.google.com/maps/dir/?api=1&destination={lat},{lng}`) — ye vendor listing pe "Get Directions" button me use hoga customer redirect ke liye.

### 2. Review sheet UI alignment fix (Screenshots 2 & 3)

**Problem:** Fields ke andar text left-align hai lekin label + confidence % right-side pe float kar raha hai, jisse spacing tooti dikh rahi hai. PIN code, address bahut niche scroll pe milta hai.

**Fix (`SmartScannerSheet.tsx` review phase):**
- Field card ko 2-row grid me convert karein: row 1 = checkbox + LABEL (left) + confidence pill (right); row 2 = value full-width, uniform padding (`px-3 py-2.5`), consistent font size (`text-[15px] font-semibold`).
- Priority ordering: Business Name → Mobile → WhatsApp → **Address + PIN + City + State (grouped card)** → Landmark → Shop Type → Services → Products → rest. PIN aur address ek saath dikhein, alag-alag scroll na karna pade.
- Confidence pill compact: sirf color dot + % (no "High/Medium/Low" text — space bachega).
- Sticky footer me "Re-scan" + "Apply to Form" (already hai, bas padding fix).

### 3. Vendor Join form alignment fix (Screenshot 4)

**Problem:** Screenshot me PIN code field, WhatsApp field, Business Type field — sab alag-alag widths me hain, right side me bada empty space, mic icons randomly placed.

**Fix (`vendor.join.tsx` form section):**
- All inputs full-width (`w-full`), consistent `h-11 rounded-xl`, icon slot fixed 40px on left, mic slot fixed 36px on right.
- 2-column grid sirf desktop pe (`md:grid-cols-2`), mobile pe hamesha single column.
- "Use my location" chip + PIN + Address ek visual group me (bordered card) — taki relationship clear ho.
- Business type dropdown text truncate na ho — `min-w-0 flex-1`.

### 4. Auto Category Mapping (naya flow after submit)

**Yeh aapki actual request hai:** vendor submit kare → shop board/products hint ke base pe categories/sub-categories automatic pre-select ho jayein.

**Implementation:**
- Naya server fn `suggestCategoriesFromScan` (`src/lib/category-suggest.functions.ts`):
  - Input: `{ shop_type_hint, services[], products[], business_name }` (scanner se already extract ho raha hai).
  - Gemini call: existing `TRADE_TREE` (`src/lib/trade-tree.ts`) ko system prompt me deta hai, model se ranked path array return karvata hai (e.g. `[["retailer","apparel_r"], ["wholesaler","apparel_w"]]`) + confidence per suggestion.
- Submit ke baad `/vendor/categories` route (naya, ya existing category step) khulega with pre-selected checkboxes:
  - Top suggestion auto-selected (green highlight + "AI suggested" badge).
  - Alternates suggested with confidence %.
  - Vendor manually add/remove kar sakta hai.
- Selected categories `vendors.trade_selection` (jsonb) me save + `vendor_categories` join table (already exists ya create karna hoga — check karke).
- Next mapping step: "Products & Services" — same pattern se products array se product catalog suggest karein.

### 5. Smoothness improvements
- Review sheet me `framer-motion` `AnimatePresence` staggered field reveal (already partial hai).
- Success haptic (`navigator.vibrate(30)`) on "Apply to Form" & submit.
- Skeleton loader for map (shimmer) instead of blank grey.
- Toast messages Hinglish + consistent icon.

---

### Files to change

**Edit:**
- `src/components/vendor-join/MapPinPreview.tsx` — fix async Maps loading + fallback geocoding + auto-confirm
- `src/components/vendor-join/SmartScannerSheet.tsx` — review card grid alignment, field ordering, compact confidence
- `src/routes/vendor.join.tsx` — form field alignment (input widths, icon slots)
- `src/lib/maps.functions.ts` — add fallback geocoding (pincode-only retry)

**Create:**
- `src/lib/category-suggest.functions.ts` — Gemini-powered category suggestion server fn
- `src/components/vendor-join/CategoryMappingStep.tsx` — post-submit auto-select UI

**Migration:**
- Add `lat`, `lng`, `google_maps_url` columns to `vendors` (if not present)
- Add `suggested_categories` jsonb to `vendors` for audit
- Create `vendor_categories` join table (if not present) with RLS + GRANTs

### APIs needed
✅ Google Maps connector (already connected) — geocoding, reverse geocoding, browser Maps JS
✅ Lovable AI (Gemini) — already used, category suggestion bhi isi se
✅ Supabase — already connected

**No new API keys required.**

### Cost impact
- Category suggestion: ~₹0.03/vendor (1 Gemini flash call)
- Map load: free tier me hai
- Total per vendor onboarding: ~₹0.10 (OCR + confidence + category = 3 AI calls)

---

Approve karo to main build mode me implement karta hoon.
