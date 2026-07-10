# Product/Service Mapping — Simplify & Reuse in Onboarding

## पूरा overview (Hindi)

आपकी screenshots से 3 दिक्कतें clear हैं:

1. **Type buttons (Service / Product / Other)** अभी नीचे fixed bottom bar में हैं — इसे ऊपर header के नीचे segmented top bar बनाना है।
2. **Category & Sub-category picker sheets** में सिर्फ text list दिख रही है — admin से जो icon/image आ रहा है वो नहीं दिख रहा। Cards भी बहुत छोटे और flat हैं।
3. Onboarding का Step 2 ("Category Mapping") अभी अलग `InventoryMappingSheet` component खोलता है — आप चाहते हैं कि यही `vendor/services` वाला page खुले ताकि दोनों जगह same experience रहे।

बाकी personality (cream/gold theme, toggle, pricing sheet, + suggest, group tabs, cards) बिल्कुल same रहेगा — सिर्फ layout re-arrange और picker beautify होगा।

---

## Changes

### 1. `src/routes/vendor.services.tsx` — layout re-order (same file, same logic)

- **Top area (नीचे header के):** एक sticky segmented bar जिसमें Service / Product / Other pills — active gold gradient, inactive white with gold border। यही अभी नीचे है, वहाँ से हटा के ऊपर आएगा।
- **Bottom bar अब सिर्फ एक:** Category | Sub-category | `+` suggest — same look, बस अकेला row (type वाला bar delete)।
- **Auto-open picker:** पहली बार जब type change हो और `catId` set हो जाए, तो category picker sheet अपने आप खुले (आप कह रहे थे "open हो के सामने आए")। User एक बार select कर ले तो auto-open बंद।

### 2. `PickerSheet` beautify (same file)

- Cards बड़े: `p-4` की जगह `p-4 min-h-[64px]`, बीच में flex row: **icon/image (48×48 rounded-2xl)** + name (base font, bold) + selected checkmark right side।
- Icon source priority:
  - Category picker: `categories.icon` (emoji/text) या future `image_url` — अभी `categories` में `image_url` नहीं है तो `catalog_groups`/fallback emoji circle।
  - Sub-category picker: same source।
- Fallback: gold gradient circle with first letter (जैसा services list में items के लिए `IconImage` fallback है)।
- Selected state: gold gradient background + gold border (जैसा अभी है, बस bigger)।
- Sheet header में subtitle ("Type se linked X categories") add।

> Backend/schema बिलकुल नहीं change होगा — जो field `categories`/`catalog_groups` में admin से आ रहा है वही read होगा। अगर image field नहीं है, तो emoji/letter fallback दिखेगा और future में admin panel से image डालते ही auto reflect।

### 3. `src/routes/vendor.join.tsx` — Step 2 को link करना

- `InventoryMappingSheet` वाला Drawer हटाना (import भी)।
- Step 2 का `onClick` अब direct navigate करेगा `/vendor/services` पर।
- Vendor जब वहाँ से एक भी service/product toggle ON कर देगा, `completed.inventory` mark करने के लिए: `vendor.join` reopen होने पर `vendor_item_mappings` count > 0 check करके auto-set (already loading logic में fit होगा)।
- `draft.mappings` field और `saveInventory` function अब unused — बस Step 3 (`bothDone`) की shape same रखने के लिए `completed.inventory` derive होगा DB से।

Files touched: `src/routes/vendor.services.tsx`, `src/routes/vendor.join.tsx`. (InventoryMappingSheet.tsx untouched — deprecated, बाद में हटा सकते हैं।)

## Out of scope

- Admin panel में category `image_url` field add करना (अगर आप चाहें तो अलग follow-up)। अभी सिर्फ जो field पहले से admin से आ रहा है वो render होगा।
- Toggle/pricing/variation flow — untouched।
