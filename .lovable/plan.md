# 3 Naye Admin Modules + Play Store Launch Guide

## 1️⃣ Form Builder (Admin → Forms)

Naya page `/admin/forms` jahan aap **3 forms** ko apni marzi se customize karenge:

- **Customer Registration Form**
- **Vendor Registration Form**
- **Staff Registration Form** (future use ke liye ready)

### Har form me ye control milega:
- Field add/remove (Name, Phone, Email, DOB, Gender, Address, City, Pincode, Aadhaar, PAN, GST, Shop Name, Category, Photo, Documents, etc.)
- Field type chunna: Text / Number / Email / Phone / Date / Dropdown / Checkbox / File Upload / Image
- Field ko **Required / Optional / Hidden** mark karna
- Field ka order drag se badalna
- Custom label & placeholder Hindi/English me
- Validation rules (min, max, regex)
- **Step grouping** — multi-step form banana (Step 1: Basic, Step 2: KYC, etc.)
- **Payment gateway trigger point** — kis step ke baad Cashfree pe redirect ho (e.g. Vendor registration ke baad ₹99 fees)

### Database:
- `form_schemas` table (form_type, version, schema jsonb, is_active)
- `form_field_definitions` (master list of available fields)
- Customer/Vendor/Staff registration pages **dynamically render** karenge active schema se

---

## 2️⃣ Branding & Theme Studio (Admin → Branding)

Naya page `/admin/branding` — pure app ka look apne haath me:

### Sections:
- **Colors** — Primary, Secondary, Accent, Background, Text, Gold, Wine, Success, Danger (color picker se OKLCH/Hex)
- **Typography** — Display font + Body font dropdown (Cormorant, Inter, Playfair, Poppins, Noto Sans Devanagari, etc.) + size scale
- **Icons Pack** — Lucide / Heroicons / Phosphor switch
- **Brand Assets** — Logo (light/dark), Favicon, Splash image, App name, Tagline upload
- **Per-Surface Theme** — Customer / Vendor / Admin teeno ke liye alag color theme save kar sakte hain
- **Light/Dark mode** defaults
- **Border radius, Shadow intensity, Animation speed** sliders
- **Live Preview** panel right side me — changes turant dikhe
- **Presets** — Royal Gold / Sapphire Silver / Midnight / Custom save karke switch

### Database:
- `theme_settings` (scope: customer|vendor|admin, tokens jsonb, fonts jsonb, assets jsonb, is_active)
- Frontend boot pe active theme load karega aur CSS variables inject karega `src/styles.css` ke tokens ko override karke

---

## 3️⃣ Play Store Launch — Step-by-Step Guide

### Aapko kya chahiye (one-time):
1. **Google Play Console account** — $25 (~₹2,100) one-time fee, signup [play.google.com/console](https://play.google.com/console)
2. **Developer details** — PAN, address, phone (D-U-N-S number agar Organization account)
3. **App assets**:
   - App icon 512×512 PNG
   - Feature graphic 1024×500
   - Screenshots (min 2, phone)
   - Short description (80 char) + Full description (4000 char)
   - Privacy Policy URL (already karoonline.in pe daal sakte hain)

### Technical path — TWA (Trusted Web Activity):
Aapki app PWA hai (manifest.json + service worker ready). Hum isko **TWA** me wrap karke Play Store pe daal sakte hain — ek native wrapper jo aapki website ko native app jaisa chalata hai.

**Steps jo MAIN karunga aapke liye:**
1. **PWA polish** — manifest.json, icons (192/512/maskable), splash, service worker pakka karunga
2. **`assetlinks.json`** — already `/public/.well-known/` me hai, sirf SHA256 fingerprint paste karna hoga (Play Console se milega)
3. **Bubblewrap config** generate karunga (`twa-manifest.json`) — package name `app.karoonline.twa`, host `karoonline.in`
4. **Build instructions** dunga — aap apne laptop pe ek command chalayenge: `bubblewrap build` → `.aab` file banegi
5. **Play Console upload guide** — screen-by-screen

**Steps jo AAPKO karne padenge (main nahi kar sakta):**
- Play Console pe ₹2,100 pay karke account banana
- App ka Bubblewrap build apne computer pe chalana (Java + Android SDK install — main guide karunga)
- `.aab` file upload karna
- Store listing fill karna (text/screenshots main ready karke dunga)
- Review submit (~3-7 din me approve)

**Kya MAIN khud Play Store pe daal sakta hun?** ❌ Nahi — Google Play Console ko ek real human owner chahiye, payment + identity verification ke liye. Lekin 90% kaam (build files, assets, descriptions, listing copy) main ready karke dunga, sirf upload aapko karna hoga.

---

## Execution Order
1. Form Builder (DB + admin UI + dynamic renderer for register pages)
2. Branding Studio (DB + admin UI + theme injector)
3. Play Store kit (PWA polish + Bubblewrap config + step-by-step PDF guide in `/mnt/documents/`)

Kya ye 3-step plan theek hai? Approve karne ke baad main ek-ek karke implement karunga (forms pehle, fir branding, fir Play Store kit).
