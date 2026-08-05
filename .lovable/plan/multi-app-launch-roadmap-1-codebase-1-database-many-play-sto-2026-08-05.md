# Multi-App Launch Roadmap — 1 Codebase, 1 Database, Many Play Store Apps

## Aap kya chahte ho
Har module (One QR, Quick Shop, Digital Shop, Referral Program, Vendor, Staff) ek **alag Play Store app** ho.
Database ek hi rahe, login ID/password same rahe (ek account, sab apps me chale), aur feel pura **native Android** lage.

## Kaise kaam karega (simple bhaasha me)

Ek hi website/app code hai. Us code ke andar hum "variant" ka concept use karte hain — matlab app ko launch hote hi bata dete hain "tu One QR app hai" ya "tu Referral app hai". Us hisaab se:

- App khulte hi apna hi home screen kholta hai (One QR app → QR dashboard, Referral app → referral dashboard)
- App ke andar sirf uske matlab ke tabs/menu dikhte hain, baaki module chhup jaate hain
- Icon, naam, splash, theme colour har app ka apna
- Login same Cloud (database) se hota hai, to ek app me login karne ke baad dusri app me bhi wahi account chalega

Project me yeh system pehle se aadha bana hua hai (`src/lib/app-variant.ts` — customer/vendor/staff, aur teen Capacitor config files). Hum usi ko badha kar 6 variants tak le jaayenge.

## Phase 1 — Variant system ko expand karna
- Variant list badhao: `customer`, `vendor`, `staff`, `oneqr`, `shop`, `referral`
- Har variant ka: landing route, app naam, theme colour, allowed routes
- Build-time env (`VITE_APP_VARIANT`) + runtime detect (`?app=` / user-agent) — dono support

| App | Package name | Landing screen |
|---|---|---|
| Karo Online (customer) | app.karoonline.twa | /quick |
| Karo Vendor | app.karoonline.vendor | /vendor/dashboard |
| Karo Staff | app.karoonline.staff | /staff |
| Karo One QR | app.karoonline.oneqr | /one-qr |
| Karo Digital Shop | app.karoonline.shop | /vendor/shop |
| Karo Referral | app.karoonline.referral | /referral |

## Phase 2 — Har app ka apna "shell" (Android feel)
- Variant-aware bottom navigation: orange dock ke items variant ke hisaab se badalenge (One QR app me QR/Visitors/Links/Profile)
- Variant-aware top bar aur splash colour
- Native back button, status bar, immersive mode — pehle se hai, sirf variant colours wire karne hain
- Jo route uss app ka nahi hai, wahan "yeh feature <App naam> me hai" wala clean screen + Play Store link (deep-link handoff)

## Phase 3 — Login aur data sharing
- Auth same rahega (Lovable Cloud). Ek hi email/phone + password sab apps me
- Role/permission check same `user_roles` se — koi naya table nahi
- Jo bhi user One QR app me banata hai, wo customer app me bhi dikhega (same database)
- Session har app me alag rahegi (Android sandbox rule) — user ko ek baar per app login karna padega, credentials same

## Phase 4 — Play Store packaging
- Har app ke liye: `capacitor.config.<variant>.ts`, icon set, splash, manifest, `google-services.json` entry (same Firebase project, 6 Android apps register karenge)
- `assetlinks.json` me sab 6 package + SHA-256 fingerprint (deep links ke liye)
- Build command per variant, GitHub Actions matrix se 6 AAB ek saath ban sakte hain
- Play Console me 6 separate listings (title, description, screenshots)

## Phase 5 — Cross-app promotion
- Har app me "Our other apps" section — dusri apps ke Play Store links
- Deep link: `karoonline.in/one-qr` khulega One QR app me agar installed hai, warna browser/Play Store

## Roadmap (order)
1. Variant config expand + variant-aware dock/topbar (web par test)
2. One QR app ko pehla alag app banao (sabse ready module hai) → Play Store par
3. Referral app → Play Store
4. Digital Shop app → Play Store
5. Vendor + Staff apps refresh (already configs hain)
6. Cross-app promo + deep links

Ek-ek app step by step nikaalna best hai — pehla wala approve hone ke baad baaki fast ho jaate hain.

## Technical notes
- `src/lib/app-variant.ts`: `AppVariant` union expand, `initialRouteForVariant`, naya `variantConfig` map (naam, colour, allowed route prefixes, dock items)
- `src/components/AppShell.tsx` + `FloatingDockNav.tsx`: dock items variant map se aayenge, `/` only wali condition ko variant ke home route se replace
- Naye `capacitor.config.oneqr.ts`, `.shop.ts`, `.referral.ts` (existing files ke pattern par)
- `scripts/patch-native-android.mjs`: package name ko config se lo (hard-coded `app.karoonline.twa` paths parameterize)
- `public/.well-known/assetlinks.json`: 6 entries
- Koi DB migration nahi chahiye is roadmap me
