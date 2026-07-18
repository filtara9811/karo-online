
## Goal

Customer के request raise करते ही (variation select → Find Vendor), 10 km (या selected radius) के अंदर उस product/service से mapped सभी vendors की profiles automatic दिखें — vendor को accept करने की जरूरत नहीं।

---

## Part A — Auto-Match Flow (implementation plan)

### 1. Lead create होते ही auto-match server function
नया server function: `autoMatchLeadVendors(leadId)`
- Lead का `sub_category_id` / `item_ids` / `origin` / `radiusKm` पढ़ेगा
- `vendor_item_mappings` + `vendors` से approved, non-blocked, in-radius vendors निकालेगा (same logic जो `getNearbyOnlineVendors` में है)
- हर matched vendor के लिए `lead_notifications` में row insert करेगा with `status = 'accepted'`, `auto_matched = true`
- Optional: parallel push/WhatsApp fire-and-forget (vendor को inform करने के लिए, but customer flow इस पर wait नहीं करेगा)

### 2. `FindingVendorOverlay` behaviour update
- Existing radar animation ~2–4 sec चले (premium golden feel रखें)
- Fetch `get_lead_accepted_vendors` — अब यह auto-matched vendors देगा
- Realtime channel वैसा ही, बस अब accept event तुरंत आएगा (auto)
- "Vendor accept कर रहा है" copy → "आपके पास के vendors ला रहे हैं…"
- 0 vendors → existing `NoVendorsFallback` (radius बढ़ाएं suggestion)

### 3. Radius selection wiring
Home screen की "1 / 2 / 5 / 10 km" pill अभी UI-only है — इसे `createLead` payload में `radius_km` के रूप में persist करें ताकि auto-match उसी radius पर filter करे।

### 4. Vendor side (backwards compatible)
Vendor dashboard पर auto-matched leads एक अलग tab/badge "Auto-assigned" में दिखें, ताकि vendor को पता चले customer आ रहा है। Accept/Reject button hide — सिर्फ "Call / Chat / Mark done" रहें।

### 5. Migration
- `lead_notifications` में `auto_matched boolean default false` column
- `leads` में `radius_km int default 10` column (अगर पहले से नहीं है)
- RLS: customer अपने lead के accepted vendors पढ़ सके (already via RPC), vendor अपने auto-matched leads पढ़ सके

---

## Part B — Launch Readiness Guide (क्या-क्या बाकी है)

आपने पूछा "आगे की guide दीजिए" — यह prioritized roadmap है:

### 🔴 Launch Blockers (पहले करें)
1. **Auto-match flow** (Part A ऊपर) — core UX
2. **Vendor onboarding funnel test** — नया vendor register → KYC → shop live तक end-to-end एक बार manual test
3. **Payment/Wallet real-money test** — Cashfree/Razorpay sandbox → live keys, ₹1 का real transaction
4. **Push notification delivery** — FCM token registration + actual delivery on Android build (customer + vendor)
5. **Legal pages live** — Privacy, T&C, Refund, Shipping — already routes हैं, content review करें
6. **Play Store assets** — screenshots, feature graphic, privacy policy URL, data safety form

### 🟡 Launch से पहले Polish
7. **Empty states** हर screen पर (no leads, no vendors, no orders)
8. **Offline mode** wiring (infra ready है per AUDIT_REPORT — 6 surfaces बाकी)
9. **Analytics events** — signup, lead_created, vendor_matched, order_completed (Firebase Analytics या PostHog)
10. **Error monitoring** — Sentry integration
11. **Rate limiting** — lead creation पर (1 customer / 5 min same category) to prevent spam
12. **Vendor rating/review** — order complete होने के बाद 1-tap rating

### 🟢 Launch के बाद (v1.1)
13. Real-time customer recognition push (jab पुराना customer 10km में आए)
14. Multi-location vendor service areas (एक vendor कई zones cover करे)
15. Loyalty coins redemption UI
16. Referral leaderboard public page
17. In-app chat translation (Hindi ↔ English)
18. Voice search Whisper API integration
19. Admin: bulk vendor CSV import
20. WhatsApp Business API verified sender (currently sandbox)

### 📊 Metrics to watch post-launch
- Time from "Find Vendor" tap → first vendor profile visible (target: < 4 sec)
- % leads getting ≥ 1 vendor match (target: > 80% in launch cities)
- Vendor response time to customer call/chat
- Customer → order conversion
- Vendor retention (30-day)

---

## अगला step

Confirm करें:
1. क्या मैं Part A (auto-match flow) **अभी implement** करूं?
2. Default radius **10 km** रखें, customer 1/2/5/10 pill से बदल सके?
3. Vendor को "auto-assigned lead" का push notification तुरंत जाए (सिर्फ inform करने के लिए, accept required नहीं)?

Approve करते ही code changes शुरू करूंगा।
