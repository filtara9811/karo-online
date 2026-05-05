# Phase 1 — Admin Panel Foundation

हम Phase 1 से शुरू कर रहे हैं। Admin panel में 3 नए section जोड़ेंगे, जो Phase 2 (vendor wallet) और Phase 3 (Shiprocket/Porter) की foundation बनेंगे।

---

## आपकी key requirement (samajh li)

> "हर payment gateway अलग तरीके से — एक gateway **Wallet recharge** के लिए, दूसरा **LeadX Coin buy** के लिए।"

इसका मतलब है `payment_gateways` table में हर gateway को एक **purpose** assign करना है:
- `wallet_recharge` — vendor Service Wallet (₹) recharge करने के लिए
- `coin_purchase` — vendor LeadX Coins खरीदने के लिए
- `both` — agar same gateway दोनों के लिए use करना चाहें

So vendor app में जब "Add Funds" दबाएगा → सिर्फ `wallet_recharge` वाला gateway खुलेगा। जब "Buy Coins" दबाएगा → सिर्फ `coin_purchase` वाला खुलेगा।

---

## क्या-क्या बनेगा (Phase 1 scope)

### A. Database (one migration)

1. **`payment_gateways` में 2 नए columns**
   - `purpose` text — values: `wallet_recharge` | `coin_purchase` | `both` (default `both`)
   - `priority` int — agar same purpose पर 2 gateway active हों तो कौनसा pehle use हो

2. **New table `logistics_gateways`** (बिल्कुल `payment_gateways` जैसी shape)
   - `id, provider, display_name, is_active, is_test_mode, config jsonb, public_key, supports_hyperlocal bool, supports_intercity bool, supports_international bool, priority int`
   - Seed rows: Shiprocket, Porter, Delhivery (inactive by default — admin enable करेगा)
   - RLS: same pattern (admin view, super_admin write)

3. **New table `coin_pricing_config`** (single-row config)
   - `id, coin_rate_inr numeric (default 20)` — 1 coin = ₹20
   - `min_purchase_coins int (default 50)`, `max_purchase_coins int (default 5000)`
   - `gst_percent numeric (default 18)`
   - `updated_at, updated_by`
   - Seed 1 default row

4. **New table `coin_packs`** (predefined recharge packs जैसा "Buy 100 coins ₹1800 (Save 10%)")
   - `id, pack_name, coins int, price_inr numeric, bonus_coins int, is_active bool, sort_order int`

5. **New table `wallet_recharge_packs`** (Service Wallet ke liye — "Add ₹500 / ₹1000 / ₹2000")
   - `id, label, amount_inr numeric, bonus_inr numeric default 0, is_active bool, sort_order int`

> Note: Actual `vendor_wallets` और `wallet_transactions` tables Phase 2 में बनेंगे (जब vendor-facing UI बनाएंगे)। Phase 1 सिर्फ admin config foundation है।

### B. Admin UI — 3 नए pages + sidebar updates

1. **`/admin/logistics`** (नई route file `admin.logistics.tsx`)
   - Bilkul `/admin/payments` जैसा design (gold theme, GoldCard grid)
   - Per-gateway: enable/disable, test mode, public key/auth token field, hyperlocal/intercity/international toggles, priority
   - Sidebar में नया item "Delivery Gateways" (Truck icon)

2. **`/admin/payments`** (existing file update)
   - हर gateway card में नया **Purpose selector**: 3 radio buttons → "Wallet Recharge" / "Coin Purchase" / "Both"
   - Priority field (number input, lower = higher priority)
   - Header में helper banner समझाने के लिए कि ek gateway wallet ke liye, dusra coins ke liye assign करो
   - Validation: कम-से-कम 1 active gateway हर purpose के लिए होना चाहिए (warning, hard block नहीं)

3. **`/admin/coins`** (नई route file `admin.coins.tsx`) — "Coin & Wallet Pricing"
   - Section 1: **Coin rate** — ₹ per coin, GST %, min/max purchase
   - Section 2: **Coin Packs** CRUD list (50/100/250/500 coins के preset packs)
   - Section 3: **Wallet Recharge Packs** CRUD (₹500/₹1000/₹2000 quick-add buttons + bonus)
   - Sidebar item "Coins & Wallet" (Coins icon)

4. **`/admin` (Dashboard)** — small additions
   - 2 नए stat cards: "Active Logistics Gateways", "Coin Rate (₹/coin)"

### C. Sidebar order (final)
```
Dashboard
Customers
Vendors
Catalog
Staff & Roles
Payment Gateways
SMS Gateways
Delivery Gateways    ← new
Coins & Wallet       ← new
Legal Pages
App Settings
```

---

## Technical notes

- कोई edge function Phase 1 में नहीं — सिर्फ DB + admin UI।
- सभी secret keys (Shiprocket API token, Porter secret, Razorpay key_secret) Supabase **secrets** में जाएंगी, public key/token सिर्फ DB में। Admin UI पर helper text दिखेगा।
- Migrations पर RLS policies pehle से tested pattern से (`is_admin_user`, `has_role(super_admin)`) लगेंगी।

---

## आगे क्या (after आप approve करेंगे)

Phase 1 deploy होने के बाद Phase 2 शुरू करूंगा:
- `vendor_wallets`, `wallet_transactions` tables
- Vendor dashboard में 2 wallet cards (Coins + Service Wallet)
- Razorpay/PhonePe checkout flow दोनों purposes के लिए अलग
- Auto-top-up toggle

Phase 3 में Shiprocket + Porter live integration + auto-debit।

---

## Quick clarifying questions (आप develop के दौरान बता सकते हैं — मैं रुकूँगा नहीं)

1. **Default coin rate** ₹20/coin रखें या आप कुछ और बताएंगे?
2. **Logistics providers seed list** — Shiprocket + Porter के अलावा Delhivery भी रखूँ या सिर्फ ये 2?
3. **Existing payment gateways** का default `purpose` क्या set करूँ — `both` (safe) या आप manually assign करेंगे?

ये default values से शुरू करूँगा, आप बाद में admin से change कर सकते हैं।

**Approve करें तो मैं Phase 1 implement करना शुरू करता हूँ।**
