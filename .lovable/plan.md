# Super Admin Control + Play Store Deploy

## Part 1 — 4-digit Support Code (Customer = Vendor = same user)

Har user ke liye ek unique **4-digit Support Code** (e.g. `4821`) auto-generate hoga — referral code ki tarah, but sirf 4 digits, sirf admin-search ke liye.

- Naya column `support_code` `customers` table mein (UNIQUE, 4 digits, 1000–9999 range).
- Auto-generate trigger: jab bhi naya customer row bane, ek unused 4-digit code assign ho jaye.
- Backfill: sabhi existing customers ko ek code mil jaye.
- Vendor same user hota hai (`vendors.user_id = customers.user_id`), to vendor ke liye alag code nahi — same support code dono jagah dikhega.
- 4 digits = max 9000 unique codes. Agar future mein zyada users hue to humein 5 digits pe shift karna padega — abhi ke liye theek hai.

## Part 2 — Super Admin "Customer 360" Page

Naya page: **`/admin/lookup`** (sidebar mein "🔍 User Lookup" naam se).

Ek single search bar — yeh sab accept karega:
- 4-digit support code (`4821`)
- Phone number (any format)
- Email
- Naam
- User ID (UUID)

Result ek **unified profile drawer** kholega jisme ek hi user ke saare faces:

**Tabs:**
1. **Profile** — naam, phone, email, address, avatar, gender — sab inline editable. Save = direct DB update via admin server fn.
2. **Vendor** (agar registered hai) — business name, trade, KYC status, GST/PAN/Aadhaar, manager email — sab editable. Vendor register nahi hai to "Promote to Vendor" button.
3. **KYC** — documents preview, Approve / Reject / Re-request buttons, manual override fields.
4. **Wallet** — LeadX coins balance, service wallet (₹), lifetime stats, recent transactions. Admin actions: **Credit coins / Debit coins / Credit ₹ / Debit ₹** (sab audit log mein jayega).
5. **Activity** — recent leads, orders, referrals (read-only timeline).
6. **Danger zone** — Block/Unblock, Verify/Unverify, Force logout, Reset password link send, Delete account.

Saari actions super-admin role-check ke peeche (already existing `is_admin_user` + `super_admin` role).

## Part 3 — Existing pages enhancement

- `admin.customers.tsx` aur `admin.vendors.tsx` ke list cards par **support code badge** dikhega (e.g. `#4821`).
- Existing filter bar mein support-code se direct search.
- Existing `AdminRecordDrawer` ke "Edit" mode mein sab fields editable (abhi limited hai) + KYC tab + wallet tab inline.

## Part 4 — Server functions (secure)

Naye server fns `src/lib/admin-lookup.functions.ts`:
- `lookupUser(query)` — fuzzy search, returns unified profile
- `updateUserProfile(userId, patch)` — admin override on `customers`
- `updateVendorProfile(userId, patch)` — admin override on `vendors`
- `setKycStatus(userId, status, note)` — KYC approve/reject
- `adjustWallet(userId, kind, direction, amount, reason)` — wallet credit/debit + transaction log
- `setBlockStatus(userId, blocked)` — block toggle on both customers + vendors

Sab `requireSupabaseAuth` + super-admin role check ke saath.

## Part 5 — Play Store Deployment — Step-by-Step

Code ready hai (PWA + Capacitor wrapper banana padega). Yeh main aapko ek detailed **`PLAYSTORE_DEPLOY.md`** file project root mein bana ke doonga, jisme ye sab hoga:

1. **Capacitor setup** — `bun add @capacitor/core @capacitor/android @capacitor/cli` + `npx cap init`
2. **Android project generate** — `npx cap add android`
3. **Build web** — `bun run build` + `npx cap sync android`
4. **Android Studio mein kholna** — `npx cap open android`
5. **Icons & splash** — `public/icon-512.png` use karna, splash configure karna
6. **AndroidManifest** — permissions (location, notifications, camera), deep links
7. **Signing key generate** — `keytool` command, keystore safe rakhna
8. **`build.gradle`** — version code, version name, applicationId (`in.karoonline.app`)
9. **AAB build** — `./gradlew bundleRelease`
10. **Play Console** — naya app, content rating, data safety form, screenshots upload, listing (short + long description — already humne discuss kiye hain), AAB upload, internal testing → production
11. **Privacy policy URL** — `https://karoonline.in/privacy` (already live hai)
12. **Asset Links** — `public/.well-known/assetlinks.json` (already hai) Play Console signing SHA-256 ke saath update karna

Yeh poori guide markdown file mein milegi — copy-paste karke chala sakte ho.

## Files to be created/edited

**New:**
- `src/routes/admin.lookup.tsx` — Customer 360 page
- `src/components/admin/UserLookup360.tsx` — drawer component
- `src/lib/admin-lookup.functions.ts` — server functions
- `PLAYSTORE_DEPLOY.md` — deploy guide
- Migration: add `support_code` column + trigger + backfill

**Edited:**
- `src/routes/admin.index.tsx` — add "User Lookup" tile
- `src/components/admin/AdminLayout.tsx` — sidebar link
- `src/routes/admin.customers.tsx` + `admin.vendors.tsx` — show support code badge + search

## Confirmation needed

Kya main yeh poora scope start kar doon? Logo aapne already de diya hai, woh use ho raha hai — naya nahi chahiye. Bas **"haan"** bolo to migration + saari files ek saath bana doonga.
