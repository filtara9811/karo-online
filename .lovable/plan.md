## Phase 1 — Blank screen fix (immediate)

Screenshot में `/quick` (customer home) पर header + stats के नीचे सिर्फ loader घूम रहा है — content mount नहीं हो रहा।

- `src/routes/quick.tsx` का data flow और `useEffect` chain audit करूँगा; likely कारण: एक server-fn / query pending state कभी resolve नहीं होती (auth-guarded fn public route पर, या missing catch)।
- Fix: pending state के लिए proper skeleton + fallback content (categories grid, recent vendors, promo strip) render हो, ताकि loading में भी screen कभी blank न रहे।
- Console/network से exact failing call पकड़ूँगा और उसे graceful बनाऊँगा।

## Phase 2 — 3 Capacitor apps से 1 codebase

Same repo, 3 build variants — env flag से decide होगा कौन सा app है।

```text
APP_VARIANT=customer  → app.karoonline.twa      (already live)
APP_VARIANT=vendor    → app.karoonline.vendor   (new)
APP_VARIANT=staff     → app.karoonline.staff    (new)
```

- `capacitor.config.customer.ts`, `capacitor.config.vendor.ts`, `capacitor.config.staff.ts` — तीनों अलग `appId`, `appName`, splash/icon paths।
- `package.json` scripts: `build:customer`, `build:vendor`, `build:staff` (सिर्फ `APP_VARIANT` env और सही capacitor config copy करेगा)।
- `src/lib/app-variant.ts` — runtime में `import.meta.env.VITE_APP_VARIANT` पढ़कर decide करे कौन सा landing route open हो:
  - customer → `/quick`
  - vendor → `/vendor/dashboard` (या `/vendor/join` अगर onboard नहीं है)
  - staff → `/staff/login` → `/staff`
- Root splash / cold start भी variant के हिसाब से।
- Assets (icon, splash): `resources/customer/`, `resources/vendor/`, `resources/staff/`।
- Docs update: `CAPACITOR_BUILD.md` में तीनों build commands।

Backend Supabase एक ही रहेगा — real-time sync automatic।

## Phase 3 — Staff role assign (hybrid) + deep link

Journey (admin ↔ staff):

```text
1. Admin  → /admin/staff-ops → "Invite staff"
             ↓ email + name + phone + payout_model
2. System → supabaseAdmin.auth.admin.createUser (email confirm auto)
           → insert user_roles (role=staff)
           → insert staff_profiles (status=active)
           → generate one-time deep link:
             https://karoonline.in/s/onboard/<token>
3. WhatsApp/SMS भेजा जाए (WhatsApp template + Fast2SMS)
4. Staff link क्लिक करे:
   - Staff App installed  → intent-filter उसे direct /staff/login खोले
   - Not installed        → Play Store (app.karoonline.staff)
5. Self-signup path भी open: /staff/signup → row in staff_signup_requests
   → admin /admin/staff-ops में "Pending" tab में approve → same deep-link flow
```

Deep link setup:
- `AndroidManifest.xml` (staff variant): `intent-filter` for `https://karoonline.in/s/*` with `autoVerify=true`।
- Same के लिए vendor: `https://karoonline.in/v/*` → `/vendor/join` या `/vendor/dashboard`।
- `public/.well-known/assetlinks.json` में तीनों package names add — sha256 fingerprints के साथ।
- Route: `src/routes/s.$code.tsx` (already exists — verify staff onboard token handle करता है)। नया `/s/onboard/$token` add करूँगा।
- `src/lib/native/deep-link.ts` — Capacitor `App.addListener('appUrlOpen')` से incoming URL parse करके router navigate।

## Phase 4 — Admin UI polish

`/admin/staff-ops` में:
- Tabs: Signup Requests | Active Staff | Invite New | Categories | Payouts | Withdrawals
- "Invite New": form → generate link → 1-click "WhatsApp Send" / "SMS Send" / "Copy Link"
- Role assign अभी `/admin/staff` में manual UUID paste है — नया flow से एक-क्लिक assign होगा

## Technical Details

- Files touched (approx 15):
  - `src/routes/quick.tsx` (blank fix)
  - `capacitor.config.{customer,vendor,staff}.ts` (new)
  - `package.json` (scripts)
  - `src/lib/app-variant.ts` (new)
  - `src/routes/__root.tsx` (variant-aware initial redirect)
  - `src/lib/native/deep-link.ts` (new)
  - `src/routes/s.onboard.$token.tsx` (new — staff invite landing)
  - `src/routes/v.onboard.$token.tsx` (new — vendor invite landing)
  - `src/routes/admin.staff-ops.tsx` (invite UI)
  - `src/lib/staff.functions.ts` (`inviteStaff` server fn — admin only, uses `supabaseAdmin` inside handler)
  - `android/app/src/main/AndroidManifest.xml` (staff/vendor intent filters — 3 build variants)
  - `public/.well-known/assetlinks.json` (add 2 more package sha256 slots)
  - `CAPACITOR_BUILD.md` (docs)
- 1 migration: `staff_invites (token, staff_user_id, expires_at, used_at)` table + RLS + GRANTs।

## Out of scope (जब बोलें तब)

- Chat UI का full WhatsApp-clone polish (bubbles, typing, media)
- Play Store listings — bundle IDs config कर दूँगा, upload आप करेंगे
- iOS variants (सिर्फ Android)
