# Step 1 — Fix middle-of-screen touch / scroll block (priority)

## Problem (why it happens — in plain words)

जब आप screen के बीच में उंगली रखकर ऊपर-नीचे scroll करते हैं, तो page नहीं चलता। सिर्फ far-right edge से चलता है। यही exact pattern home, `/vendors`, vendor dashboard, और marketing website पर भी मिल रहा है।

वजह दो हैं:

1. **Horizontal scrollers बीच की पूरी जगह को "अपने लिए" claim कर लेते हैं।**
   Home / vendors / dashboard में कई rows हैं जो horizontally scroll होती हैं — Banner carousel, Recommended for you, Categories rail, vendor cards rail, dashboard product strip आदि। ये सब `overflow-x-auto snap-x snap-mandatory` के साथ बने हैं। `snap-mandatory` + default `touch-action` की वजह से जैसे ही उंगली इन rows पर पड़ती है, browser उस gesture को horizontal scroll मान लेता है और vertical scroll को page तक पहुँचने ही नहीं देता। चूँकि ये rows screen का ~95% width लेती हैं, सिर्फ बिल्कुल right edge पर ही page scroll मिलता है — exactly जैसा आप screenshot में दिखा रहे हैं।

2. **कुछ हमेशा-mounted floating widgets अदृश्य रूप से बीच में बैठे हैं।** Specifically `FloatingInquiryWidget` `/quick` route पर बीच में 88vw चौड़ा fixed box बनाता है, और `FloatingInquiryWidget` का `constraintsRef` framer-motion drag के लिए full-screen overlay है। एक-दो जगह `pointer-events-none` ठीक से नहीं लगा है।

## Fix

A. **हर horizontal scroller पर `touch-action: pan-x` जोड़ें** — इससे browser को explicitly कहा जाता है "मैं सिर्फ horizontal handle करूँगा, vertical parent (page) को दे दो"। साथ ही `overscroll-behavior-x: contain` ताकि scroll-chaining साफ रहे।

   Files to patch (every `overflow-x-auto`):
   - `src/components/BannerCarousel.tsx` (line 79)
   - `src/components/CategorySections.tsx` (line 47)
   - `src/routes/home.tsx` — recommended rail (line 282) और किसी और rail पर
   - `src/routes/vendors.tsx` — chip strips और cards rail (lines 666, 792)
   - `src/routes/vendor.shop.tsx` और `VendorDashboardCard.tsx` के अंदर का marquee/strip
   - `src/components/TopProductsMarquee.tsx` और `ShopStatsTicker.tsx` अगर वैसा pattern है

B. **`snap-mandatory` → `snap-proximity` बदलें** उन rows पर जहाँ snap की ज़रूरत है। Mandatory snap mobile में vertical scroll को सबसे ज़्यादा खाता है।

C. **Floating widget audit**:
   - `FloatingInquiryWidget` के outer container पर `pointer-events: none` लगाएँ, सिर्फ अंदर के actual card पर `pointer-events: auto`। इससे card के chrome/halo area बीच की scroll को नहीं खाएगा।
   - Confirm करें कि `AppShell` के decorative blur circles (lines 94-95) `pointer-events-none` हैं — already हैं ✓.

D. **`AppShell` के `<main>` से `willChange: "transform, opacity"` हटाएँ** non-animation idle state में — यह GPU layer बनाता है जो कभी-कभी Android Chrome में input area को promoted layer में अटका देता है। Animation को pure CSS class से limit करेंगे (only for the 220ms fade), उसके बाद auto।

E. **Marketing website (`/`, `/about`, …)**: यहाँ भी same `overflow-x-auto` sections होंगे sections.tsx में — same `touch-action: pan-x` लगाएँगे।

## Verification

1. Preview खोलकर 360×682 viewport में home → middle finger drag से vertical scroll test करें।
2. Same on `/vendors`, `/vendor/dashboard`, `/quick`, `/` (marketing)।
3. Horizontal carousels अभी भी swipe होने चाहिए — कोई regression नहीं।

---

# Step 2 — FCM sound delivery

जब आप scroll fix verify कर देंगे, तब hand-off:
- `public/firebase-messaging-sw.js` में Android channel sound + `notification.sound` properly set करना।
- `register_device_token` server payload में `sound: "alert.mp3"` या default को force करना।
- iOS PWA limitation user को बताना।

# Step 3 — Payment gateway

- Cashfree और Razorpay client integration में pending issues को `src/lib/cashfree-client.ts`, `cashfree.functions.ts`, `payments.functions.ts`, `razorpay-client.ts` पर review और fix।
- Test एक dummy order से।

# Step 4 — Full bugs sweep

Touch fix + payments verify होने के बाद, core flows (auth → home → cart → checkout → vendor request → accept → chat → rating) end-to-end run करके बचे bugs ठीक करेंगे।

---

## Technical summary (for the AI on next turn)

- Add `style={{ touchAction: 'pan-x', overscrollBehaviorX: 'contain' }}` (or Tailwind `touch-pan-x`) on every `overflow-x-auto` element listed in Fix A.
- Change `snap-mandatory` → `snap-proximity` on vertical-region rails (banner, products, vendors cards).
- In `FloatingInquiryWidget.tsx`: wrap outer `motion.div` with `pointer-events-none` container and apply `pointer-events-auto` only on the inner card div.
- In `AppShell.tsx` `<main>`: remove `willChange` from inline style; rely on the keyed `lux-fade` animation alone.
- Don't touch business logic, push, or payment files in this step.

Approve to start with Step 1 only, या बताइए कि Step 2/3 भी same turn में attempt करूँ।
