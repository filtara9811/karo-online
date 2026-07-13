# Smart Scanner (OCR Auto-Fill) for Vendor Joining

Goal: Jaisa screen mein dikhaya hai — Business Information form ke upar ek floating "Smart Scanner" button ho. Tap karne par ek bottom sheet khule with **Camera** aur **Gallery** options. User visiting card / bill book / shop board ka photo le ya select kare, aur OCR se business name, owner name, mobile / WhatsApp, address, city, pincode, email, shop type automatic form mein fill ho jaye.

## User Flow

1. Vendor `/vendor/join` → Step 1 "Business Information" khole.
2. Right side floating scanner FAB (camera-frame icon, gold circle) tap kare.
3. Bottom sheet "Smart Scanner — Scan and auto fill business details" khule with 2 big tiles:
   - **Tap to Scan** (Camera) — Visiting Card / Bill Book / Shop Board
   - **Choose from Gallery**
4. Image select hone ke baad ek loading state ("Scanning… business details nikaal rahe hain") + preview thumbnail.
5. OCR complete → extracted fields ek "Review & Apply" panel mein dikhaayein (name, mobile, address, pincode, city, shop type, email). Har field ke saath ek small checkbox / toggle so user unwanted field skip kar sake.
6. "Apply to Form" button dabate hi `BusinessInfoDraft` update ho, sheet band, toast: "Details bhar diye — please check karein."
7. User manually edit kar sake before final submit (already possible).

## Extraction Logic (server-side)

Use **Lovable AI Gateway** with `google/gemini-3-flash-preview` (multimodal — image input) via `createServerFn`. Model ko structured JSON output dena hai using AI SDK `Output.object` + Zod schema:

```
{
  business_name?: string,
  owner_name?: string,
  mobile?: string,          // 10-digit Indian
  whatsapp?: string,
  email?: string,
  address?: string,
  city?: string,
  pincode?: string,         // 6-digit
  shop_type_hint?: string,  // e.g. "electronics", "grocery"
  raw_text?: string
}
```

Server function `extractBusinessCard` in `src/lib/ocr.functions.ts`:
- Input: base64 image data URL + kind ("visiting_card" | "bill_book" | "shop_board")
- Compress client-side pehle (max 1600px, jpeg 0.8) to keep payload small
- Prompt tuned per `kind` (visiting card = personal details priority; bill book = GSTIN/address; shop board = business name + type)
- Return validated object; unknown/low-confidence fields as `undefined` (not empty string) so existing draft values don't overwrite

No new secret required — `LOVABLE_API_KEY` already present.

## Frontend Pieces

- **New:** `src/components/vendor-join/SmartScannerSheet.tsx`
  - Reuses existing `CameraGalleryPicker` UI language (camera + gallery tiles), but styled per screenshot (amber gradient tile, "What can you scan?" chips, tips list, "View Scanned Data" CTA after scan).
  - Manages states: `idle → capturing → scanning → review → applied`.
  - Renders extracted fields in review step with per-field toggle.
- **New:** `src/lib/ocr.functions.ts` — `extractBusinessCard` server fn.
- **Edit:** `src/components/vendor-join/BusinessInfoSheet.tsx`
  - Add floating scanner FAB (curved arrow + gold circle) at bottom-right of the form area, matching the screenshot.
  - Wire `SmartScannerSheet`, on "Apply" merge into `BusinessInfoDraft` (only fill blank fields by default; user can toggle "overwrite existing" in review).
  - City auto-select: if OCR returns city + it exists in cities list → set; else keep manual.
  - Shop type mapping: map free-text hint to closest option from existing shop type list (simple lowercase includes match).

## Not in scope (unless asked later)
- Multi-image scan / KYC document extraction (Aadhaar/PAN) — different privacy handling.
- GSTIN lookup / verification.
- Realtime camera streaming OCR (we use capture-then-process, simpler and reliable).

## Verify
1. `bunx tsgo --noEmit` passes.
2. Playwright: open `/vendor/join`, tap scanner FAB → sheet opens → gallery picker triggers file input.
3. Manual smoke: upload a sample visiting card image via the sheet in preview, confirm review panel shows parsed fields, "Apply" fills form.

Shall I build it?
