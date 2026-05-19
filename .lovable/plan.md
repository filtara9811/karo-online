# Implementation Plan

Bahut saare points hain — main inhe 4 groups me todunga aur ek-ek karke implement karunga. Aap approve karenge to main start karunga.

---

## Group 1 — Customer Login Flow Fixes (`RegistrationFlow.tsx`, `OtpModal.tsx`)

1. **Splash screen pehle, login baad me**
   - Aaj: OTP/mobile screen pehle aata hai, splash baad me dikhta hai.
   - Fix: `RegistrationFlow` ke andar order badlenge → `OnboardingCarousel` (admin se aaye slides) → Mobile number → OTP → Basic details → Home.
   - Pehli baar install pe hi carousel chalega; baad me skip.

2. **Mobile input box se fake number hatao**
   - Input ka `defaultValue`/`value` empty rakhenge; sirf hindi/english placeholder "Mobile number" halka gray me.
   - Country code (+91) prefix label ke roop me alag rahega, value me nahi.

3. **OTP ke neeche "Verify" button**
   - Abhi auto-verify ho jaata hai 6 digit pe. User chahta hai explicit "Verify" CTA bhi ho.
   - Auto-verify hata kar — neeche gold "Verify OTP" button add karunga (disabled jab tak 6 digit na ho).

4. **Sounds**
   - Mobile number screen open hote hi ek soft ping ("mobile number darj karein" cue).
   - OTP screen open hote hi dusra ping.
   - `lead-sound.ts` me already `playPing` exist karta hai — wahi reuse karunga.

---

## Group 2 — Vendor "Form Bar-Bar" Bug

Symptom: Vendor pe jaate hi har baar registration/onboarding form khulta hai, even after vendor registered ho chuka hai.

Plan:
- `VendorAuthGate` / `vendor.register.tsx` me check karunga — kya wo `vendors` table me row check kar raha hai ya sirf local state pe depend kar raha hai.
- Agar `vendors` table me `user_id` ka entry hai → seedha `vendor.dashboard` pe redirect, form skip.
- Customer↔Vendor switch karne pe localStorage flag clear nahi karenge.

---

## Group 3 — Vendor Services / Categories Screen Redesign

Aapne screenshot bheja hai (`/vendor/services`) jisme Service / Product / Other tiles hain.

1. **Stacked bottom sheets**:
   - Step 1: Type select (Service / Product / Other) → bottom sheet slide-up with categories.
   - Step 2: Category select → uske upar dusri bottom sheet slide-up with sub-categories.
   - Har sheet ke top-right corner pe X button to close just that sheet.
2. **On/Off toggle per sub-category**:
   - Auto-accept-leads jaisa pill toggle (green = ON/linked, gray = OFF).
   - ON karte hi vendor us category ke leads receive karega; OFF karte hi link hat jaayega.
3. **Visual polish**: gold-accent dividers, better spacing, glass sheet treatment.

---

## Group 4 — End-to-End Flow Audit + Profile Notification Counts

Main browser me khol kar test karunga:
1. Customer flow: splash → OTP → register → home → place lead.
2. Vendor flow: lead popup, bell sound, accept/reject, chat.
3. Notification counts:
   - Customer home pe profile avatar pe unread count badge.
   - Vendor home pe profile avatar pe unread count badge.
   - Admin → vendor → customer notification trips all visible with count.

End me main aapko bataunga:
- ✅ Kya kaam kar raha hai
- ⚠️ Kya pending hai launch ke liye
- 🚀 Kya hum launch kar sakte hain ya nahi

---

## Files I'll touch
- `src/components/RegistrationFlow.tsx` — splash-first ordering, empty mobile field
- `src/components/OtpModal.tsx` — explicit Verify button, ping sounds
- `src/components/VendorAuthGate.tsx` + `src/routes/vendor.register.tsx` — registration persistence check
- `src/routes/vendor.services.tsx` + new `CategoryStackSheet.tsx` — stacked bottom sheets + toggle
- Audit only (no edits unless bug found): `src/hooks/use-vendor-leads.tsx`, `src/components/LeadAlertStack.tsx`, `src/routes/profile.tsx`, `src/routes/vendor.dashboard.tsx`

---

**Confirm karein** "haan, start karo" — main turant Group 1 se shuru karunga. Agar kisi group ko skip ya reorder karna hai to bata dijiye.
