## Customer Login & Signup Flow — Implementation Plan

### क्या बनेगा (User Flow)

**Step 1 — App खुलते ही / कहीं भी touch करते ही:**
- जब customer signed-in नहीं है और कोई भी action करे (search, service tap, request, cart, profile, chat — कुछ भी), तुरंत bottom-sheet खुलेगी।
- Sheet में सिर्फ **एक field: Mobile Number (10 digit)** + **Continue** button।
- Top-right में **X** button — close करने पर सिर्फ वो action रुकेगा, page नहीं बदलेगा।
- 2-minute auto-open और floating "Sign Up / Login" button — दोनों हटा दिए जाएंगे (अब "tap to act → gate" model)।

**Step 2 — OTP Sheet:**
- सिर्फ **6 OTP boxes** + **timer (00:45)** + **Resend OTP** (timer 0 होने पर enable)।
- **Auto-detect**: Web OTP API (`<input autocomplete="one-time-code" inputmode="numeric">`) — Android Chrome पर SMS से auto-fill होगा।
- Manual entry भी allowed। 6 digits डालते ही auto-verify।
- Back arrow (←) — mobile screen पर वापस; X — पूरी sheet close।

**Step 3 — Already Registered Check (OTP verify के बाद):**
- अगर customer profile पहले से complete है (`name + address` मौजूद):
  → **Green tick + "Welcome back, {name}"** 1.2 sec दिखेगा → sheet close → home पर रहेगा/redirect।
  - कोई form नहीं खुलेगा।
- अगर **first time** / profile incomplete:
  → पूरा existing **RegistrationFlow progress** चलेगा (Email → Address auto-detect → Referral/Manager → Terms) — जैसा अभी चल रहा है, कुछ नहीं बदलेगा।

**Step 4 — Logout:**
- Menu bar से logout → session clear → अगली बार किसी action पर वही mobile-number sheet खुलेगी।

### Files में Changes

1. **`src/components/AuthGate.tsx`** — पूरा rewrite:
   - 2-min auto-open + floating CTA हटाएं।
   - नया `useAuthGate()` context expose करेगा: `requireAuth(callback)` — कोई भी component इसे call करे, gate खुले, success पर callback चले।
   - Internal state: `mobile` step → `otp` step → `registered? welcome : registration`।

2. **`src/components/MobileLoginSheet.tsx`** (नया) — mobile + OTP combined bottom-sheet:
   - Glass sheet, X top-right, back arrow OTP step पर।
   - OTP input: `autocomplete="one-time-code"` for auto-fill।
   - Timer 45s, resend।
   - Calls existing `sendOtp` / `verifyOtp` server functions।

3. **Trigger points** — इन जगह `requireAuth()` से wrap करेंगे:
   - `src/routes/index.tsx` / `quick.tsx` — service card tap, "+" Add button, search submit।
   - `src/components/HomeBasket.tsx` — cart actions।
   - `src/routes/chat.tsx` — chat send।
   - `src/components/NeedsSheet.tsx` — request raise।
   - बाकी जगह तब add करेंगे जब आप कहें।

4. **`src/components/RegistrationFlow.tsx`** — सिर्फ entry point: mobile + OTP steps **skip** होंगे जब AuthGate से आए (already verified)। बाकी progress (email/address/referral/terms) वैसा ही।

### Suggestions (आपकी राय चाहिए — implement करने से पहले)

1. **"कहीं भी touch" का दायरा** — मेरा suggestion: सिर्फ **action-based triggers** (service tap, search, cart, chat, +) पर gate खोलें। पूरे screen पर random touch detect करना UX के लिए annoying होगा (scroll भी touch है)। ठीक है?

2. **OTP Auto-fill** — Web OTP API सिर्फ **HTTPS + Android Chrome + correct SMS format** (`<#> Your code is 123456 @karoonline.in #123456`) पर काम करता है। Fast2SMS template में ये format नहीं है, इसलिए auto-fill **partially** ही चलेगा (Android keyboard suggestion bar में OTP दिखेगा — 1 tap में fill)। पूरा silent auto-fill के लिए template बदलनी पड़ेगी। अभी keyboard-suggestion वाला approach ठीक है?

3. **Welcome screen duration** — 1.2 sec ठीक है या आप 2 sec चाहेंगे?

4. **Already-registered detection** — `customers` table में `name + address` दोनों होने पर "registered" मानूं? या सिर्फ `name`?

### Technical Details
- AuthGate को context provider बनाऊंगा ताकि कोई भी component `useAuthGate().requireAuth(fn)` call कर सके।
- Mobile + OTP एक ही sheet में steps के form में (smooth transition)।
- Registration steps वही reuse होंगे — duplicate code नहीं।
- localStorage dismiss-timer logic हटेगी (अब manual trigger model)।

---

**आप 4 suggestions पर हाँ/ना बता दीजिए, फिर मैं implement शुरू करूंगा।**
