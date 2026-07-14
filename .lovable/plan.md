
# Smart Scanner v2 — पूरा Roadmap (हिंदी में)

## 🔑 सबसे पहले: कौन-कौन सी API चाहिए?

**खुशखबरी — कोई भी नई API key नहीं लेनी पड़ेगी।** सब कुछ already project में configured है:

| API | क्या करेगी | Status |
|---|---|---|
| **Lovable AI (Gemini 3 Flash)** | Image OCR, category auto-detect, multi-image merge, product/service suggest | ✅ Ready (`LOVABLE_API_KEY`) |
| **Google Maps Platform** | Address → lat/lng geocoding, place autocomplete, map pin preview | ✅ Ready (`src/lib/maps.functions.ts` में connector connected है) |
| **India Post Pincode API** | Pincode → City/District/State fallback | ✅ Free public API, no key |

**आपको admin panel में कोई API field manually नहीं भरनी है।** सब backend में inject होता है।

---

## 🎯 Vendor Journey — नया Flow

```text
    Vendor "Join" खोलता है
              ↓
    [ Smart Scanner FAB (⚡ AI) ]
              ↓
    ┌─────────────────────────────┐
    │  Multi-photo Capture Sheet  │
    │  • Visiting Card  📇        │
    │  • Shop Banner    🏪        │
    │  • Bill Book      🧾        │
    │  → कई photos एक साथ add करो │
    └─────────────────────────────┘
              ↓
    Gemini सारी images एक साथ पढ़ता है
    → best data merge करता है (सबसे confident value जीतती है)
              ↓
    ┌─────────────────────────────┐
    │  Auto-detected output:      │
    │  • Business + Owner + Phone │
    │  • GSTIN + Email + Website  │
    │  • Category → Trade Tree    │
    │  • Services + Products list │
    │  • Address → Map pin 📍     │
    └─────────────────────────────┘
              ↓
    Review Sheet (editable + Add Field)
              ↓
    Form auto-fill → Next step में category-mapped
    product picker खुले
              ↓
    Scan History में save (बाद में re-apply)
```

---

## 📦 क्या-क्या Build करूँगा

### 1. **Multi-Photo Scanner** (बड़ा upgrade)
- Scanner sheet में अब **1 photo की जगह 5 तक photos** add कर सकते हो
- हर photo पर छोटा kind-tag: Visiting Card / Banner / Bill Book
- सब एक साथ Gemini को भेजे जाएंगे → वो **merge करके single best result** देगा (जैसे visiting card से phone, banner से category, bill book से GSTIN)
- Progress bar: "Scanning 3 of 3 images…"

### 2. **Smart Category Auto-detect + Trade-Tree Mapping**
- Gemini prompt में `trade-tree.ts` की सारी categories inject होंगी
- वो image देखकर हर image के लिए exact `path` return करेगा:
  ```json
  { "trade_path": ["retailer","apparel_r"], 
    "confidence": 0.92,
    "products": ["Men's shirt","Kurta","Jeans"],
    "services": ["Alteration","Home delivery"] }
  ```
- Next step (product mapping) उसी category पर auto-open होगा — vendor को दोबारा select नहीं करना पड़ेगा

### 3. **Address → Auto Location Pin** 📍
- OCR से address मिला → तुरंत **Google Maps Geocoding** call
- Latitude, Longitude, verified pincode, city, state auto-fill
- Fallback: India Post API (pincode से city/state)
- Review sheet में **mini-map preview + draggable pin** — vendor देख सकता है सही जगह है या नहीं
- यही lat/lng vendor profile में save होगा → customer के "Nearby vendors" में सही distance पर दिखेगा

### 4. **Scan History Panel** 📚
- Nया Supabase table: `vendor_scan_history` (image URL, extracted JSON, kind, created_at, user_id)
- Storage bucket: `scan-history` (private, user-scoped RLS)
- Scanner sheet में top-right पर "History" icon
- हर entry पर thumbnail + business name + "Re-apply" button
- Vendor पुराना scan खोलकर form में दोबारा apply कर सकता है
- Auto-cleanup: 30 दिन बाद delete (या 50 latest रखें)

### 5. **Extra Fields Extract** (ज़्यादा data)
Gemini अब ये भी निकालेगा:
- GSTIN (15-digit + state code auto-detect)
- Established Year
- Alternate Phone / Landline
- Landmark
- Website / Instagram / Facebook handle
- Business hours (जैसे "10 AM - 9 PM")
- Languages spoken

### 6. **Admin Panel Integration** 🛠️
- सारा scanned data `vendors` table में save होगा (already 63 columns हैं — new fields जोड़ेंगे: `gstin`, `established_year`, `landmark`, `business_hours`, `languages`, `auto_scan_confidence`)
- Admin panel में `admin.vendors.tsx` में नया tab: **"Scan Insights"**
  - कौन-सी vendor ने scanner use किया
  - Auto-fill accuracy score
  - Which images uploaded (viewer)
  - Manual override count

### 7. **Alignment Fix** (Screenshot #2)
- `vendor.listing.tsx` में shop images वाले broken slots ठीक करूँगा
- Proper empty state (Upload icon + "Add photo" text) + aspect-ratio fix

---

## 🛠️ Technical Details (short)

**Files बनाऊँगा/edit करूँगा:**
- Edit `src/lib/ocr.functions.ts` — multi-image support + trade-tree injection + geocoding call
- Edit `src/components/vendor-join/SmartScannerSheet.tsx` — multi-photo UI + history panel + map preview
- New: `src/components/vendor-join/ScanHistoryPanel.tsx`
- New: `src/components/vendor-join/MapPinPreview.tsx` (Google Maps embed)
- Edit `src/components/vendor-join/BusinessInfoSheet.tsx` — auto-select category from scan
- New migration: `vendor_scan_history` table + `scan-history` storage bucket + RLS
- Edit `vendors` table: add extra columns
- Edit `src/routes/vendor.listing.tsx` — alignment fix
- Edit `src/routes/admin.vendors.tsx` — Scan Insights tab

**AI Model:** `google/gemini-3-flash-preview` (multimodal, fast, already default)

**कोई नया package install नहीं होगा** — सब existing dependencies से बनेगा।

---

## 🚀 और क्या-क्या Add कर सकते हैं (आपकी choice)

ये सब **optional enhancements** हैं — बाद में भी जोड़ सकते हैं:

1. **Voice input** — बोलकर address बताए, तो auto text हो जाए (Web Speech API, free)
2. **GST Verification** — GSTIN निकालने के बाद उसे verify करना (paid GST API चाहिए — बाद में)
3. **Auto-translate** — vendor का Hindi/regional text → English (Gemini कर देगा)
4. **Duplicate detection** — अगर same phone/GSTIN पहले से है तो warn करे
5. **QR-code from card** — visiting card पर QR हो तो auto-scan करके UPI/website link निकाले
6. **Image enhancement** — photo blurry हो तो auto-sharpen करे (client-side canvas)
7. **Draft auto-save** — form छोड़कर जाए तो data local में save (offline भी काम करे)
8. **Bulk vendor import (admin)** — admin एक साथ 50 visiting cards upload करे → 50 vendors बन जाएँ

---

## ⏱️ Speed & Accuracy Guarantees

- **Scan time**: 1 image → ~4 sec, 3 images merge → ~7-8 sec
- **Accuracy**: Clear photos पर 90%+, blurry पर 60-70% (इसलिए review sheet editable है)
- **Cost per scan**: ~₹0.30-0.50 (Lovable AI credits से, workspace billing)
- **Offline safe**: बिना internet scanner disable दिखेगा (clear error)

---

## अगर plan approve हो तो implementation order

1. Multi-photo + trade-tree category detect + address geocoding (core)
2. Map pin preview + editable review sheet (UX)
3. Scan history table + panel (persistence)
4. Admin Scan Insights tab + extra vendor columns (admin visibility)
5. Alignment fix in vendor.listing.tsx (bug fix)

बताइए **approve** करते हो तो build mode में जाकर एक-एक step बनाना शुरू करूँ।
