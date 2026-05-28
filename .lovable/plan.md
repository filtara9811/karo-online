# Master Engine — Phased Launch Plan

हम 5 phases में deliver करेंगे। हर phase के end पर मैं आपको बताऊँगा "क्या हो गया, क्या बाकी है"। आप next phase approve करेंगे तब आगे बढ़ेंगे।

---

## Phase 1 — Vendor Operation Mode (Static / Dynamic)
**Goal:** Vendor अपनी मर्जी से Static या Dynamic mode चुन सके।

- DB: `vendors` में `operation_mode` ('static' | 'dynamic') column add।
- Vendor Dashboard में toggle card: "Shop location (Static)" vs "Live GPS (Dynamic)"।
- Dynamic mode पर pre-existing `/api/public/vendor-location` endpoint हर 30s update करेगा (Android Foreground Service से)।
- `broadcast_next_lead_batch` RPC update — Static vendors की `vendors.lat/lng` use हो, Dynamic vendors की `live_lat/live_lng` (नए columns) use हो।

## Phase 2 — Radius Sliders (Vendor + User)
**Goal:** दोनों side volume-style slider 1km → 50km + Unlimited।

- DB: `vendors.service_radius_km` (0 = Unlimited convention) + `leads.search_radius_km` add।
- Vendor settings: slider component (1–50 + ∞ stop)।
- User Quick screen: same slider before raising request।
- Matching RPC में intersection check: `distance ≤ min(user_radius, vendor_radius)` (अगर कोई unlimited है तो वो side skip)।

## Phase 3 — Sequential Proximity Search (0→1→2→5→10 km)
**Goal:** Phase 1 priority rings, premium ऊपर।

- `broadcast_next_lead_batch` को rings में refactor: 0–1 → 1–2 → 2–5 → 5–10 km।
- Premium vendors (नया `vendors.is_premium` bool) हर ring में पहले pick।
- FindingVendorOverlay current state पर ring label दिखाए: "Searching within 2 km…"।

## Phase 4 — Fallback: Not-Available Video + Find More + Referral
**Goal:** 10 km पर 0 vendor → fallback flow।

- New `NoVendorsFallback` component:
  - MP4 video (आप upload करेंगे, या placeholder)।
  - Left button **Find More** → opens expansion sheet (slider: 20 / 30 / 50 km, plus "City-wise" picker → city + area)।
  - Right button **Referral** → मौजूदा referral route पर deep link, WhatsApp share पहले से wired।
- Expansion पर new lead batch fire।

## Phase 5 — Remote/Virtual Services Bypass + Wholesaler/Retailer Filter
**Goal:** Service category के हिसाब से radius ignore करना।

- DB: `service_items.delivery_type` ('on_site' | 'remote') + `vendors.vendor_type` ('wholesaler' | 'retailer' | 'both')।
- Remote services के लिए matching engine radius skip करे — सिर्फ rating + skill tags से sort।
- User Quick screen पर Wholesaler/Retailer filter chip।

---

## Technical Notes

- सारी matching logic **Postgres RPC** में रहेगी (atomic, single round-trip)।
- Migration approval हर phase में अलग माँगा जाएगा।
- Android Foreground Service code (Kotlin) इस web project के दायरे में नहीं है — endpoint ready है, native app team को सिर्फ POST करना है (docs मैं phase 1 में दूँगा)।
- "Unlimited" convention: `radius_km = 0` = unlimited (NULL के comparison से बेहतर)।

## आज मैं Phase 1 से start करना चाहता हूँ — सही है?

Approve करते ही Phase 1 migration + UI ship करूँगा, फिर Phase 1 का status report देकर Phase 2 के लिए पूछूँगा।