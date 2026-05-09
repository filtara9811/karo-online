## Customer Onboarding UI — Premium Step-by-Step Bottom Sheets

### क्या बनेगा

Existing single sheet को **6 अलग-अलग bottom sheets** में तोड़ेंगे — हर step home screen के नीचे से smooth slide-up होगा। Home screen background दिखता रहेगा (जैसा screenshots में है)।

### Flow (Customer)

**Step 1 — Mobile Number Sheet**
- Title: "Enter mobile number"
- Single input with phone icon
- `inputMode="numeric"` + `pattern="[0-9]*"` → numeric keyboard auto
- 10 digits डालते ही → auto next (OTP send + Step 2)
- कोई picker नहीं (PWA में native picker काम नहीं करता) — सिर्फ manual input

**Step 2 — OTP Sheet**
- Top में mobile number + ✏️ edit (← back to Step 1) + "Resend OTP" (timer के बाद)
- 4 OTP boxes, numeric keyboard
- 45-sec countdown timer
- सही OTP → backend check: **already registered?**
  - **हाँ** → "Welcome back, {name}" 1.2 sec → sheet close → home (skip Steps 3-6)
  - **नहीं** → Step 3 खुले

**Step 3 — Name Sheet**
- "Enter full name" + person icon
- Input पर tap → keyboard alphabet
- Next button (golden gradient, bottom)
- *Note: gender picker आपने mention किया था — मैं name input के साथ एक छोटा gender chip row (Male/Female/Other) रखूंगा, separate picker नहीं (UX तेज़ रहे)*

**Step 4 — Email Sheet**
- "Choose email ID" + envelope icon
- Manual type (alphabet keyboard) + अगर Google session है तो auto-suggest chip ऊपर
- Next button

**Step 5 — Manager Sheet**
- "Choose manager" + tap → manager picker bottom sheet (LuxPicker reuse)
- Selected manager card show with name/area/rating
- Next button

**Step 6 — Referral + Terms Sheet**
- Gift icon + "Enter referral code" input + QR scan icon (right)
- T&C checkbox
- "Thanks for you" button (gold gradient) → success overlay → home

### Step 7 — Success
- "🎉 Thanks {name}!" with name → 1.5 sec → home (logged in)

### Already-Registered Logic

Step 2 में OTP verify के बाद RPC `lookup_customer_by_phone` call:
- अगर `name + email + address` सब हैं → **direct login**, profile claim, skip 3-6
- वरना Step 3 से form continue

Logout/uninstall के बाद वही mobile number डालने पर → auto-detect → instant login।

### Files में Changes

1. **`src/components/RegistrationFlow.tsx`** — पूरा rewrite step-machine model में:
   - State: `step: 1 | 2 | 3 | 4 | 5 | 6 | "done"`
   - हर step एक dedicated section, smooth `motion.div` slide transition
   - Old single-sheet सब hata दें
   - Premium golden styling रहेगी जैसी अभी है

2. **`src/components/StepSheet.tsx`** (नया) — reusable premium bottom-sheet wrapper:
   - Smooth spring slide-up animation
   - Gold gradient border, glass-morphism
   - Title + content + bottom CTA slot
   - Backdrop click = close

3. **`src/components/AuthGate.tsx`** — small tweak:
   - Same `requireAuth(cb)` API रहेगी
   - लेकिन अब RegistrationFlow को `transparent` mode में render (home screen दिखे background में) — already working

4. **Keyboard hints** — हर input पर proper `inputMode`:
   - Phone/OTP: `numeric`
   - Name/Email/Referral: `text` / `email`

### Technical Details

- `framer-motion` से slide animations (spring stiffness 260, damping 30)
- हर step पर URL नहीं बदलेगा (single overlay flow)
- localStorage draft persistence बनी रहेगी (refresh पर resume)
- `lookup_customer_by_phone` RPC + `save_customer_profile` flow already exists — reuse

### कन्फर्म कीजिए

1. Gender selection — separate picker step बनाऊं या Step 3 (Name) में inline chips? **(मेरी सलाह: inline chips, तेज़ flow)**
2. Address step — आपके 6 screenshots में address नहीं है, लेकिन auto-detect address अभी flow में है। **रखूं या हटा दूं?** (अगर रखें तो Step 5 बनेगा, Manager Step 6 हो जाएगा)
3. Manager step में search bar चाहिए (multiple managers होंगे) या सिर्फ list?
