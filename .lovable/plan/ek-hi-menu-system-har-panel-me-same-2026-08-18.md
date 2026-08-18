# Ek hi menu system — har panel me same

## Goal
Ek hi profile + switch menu poore app me chale: QR Business, Quick Service, Vendor, Staff, Admin — sabki jagah wahi sheet khule.

## 1. QR Business header ka profile → wahi profile menu
- Screenshot 1 me top-left avatar/title tap karne par ab Quick Service jaisa hi **Profile sheet** (bottom se 95vh) khulega — wallet, notifications, KYC, Profile Details, aur neeche wahi **Switch Panel** pill.
- Right side ka grid icon (business hub) jaisa hai waisa rahega.

## 2. Switch Panel = poora service menu (screenshot 3 wala)
Profile sheet ke bottom "Switch Panel" button par tap karne par ek hi sheet me sab options:
- Vendor Panel (vendor hai to dashboard, warna Join as Vendor)
- Digital Dukaan / Digital Shop
- All Services (Quick Service home)
- My Shop (merchant ka digital shop)
- QR Business (One QR dashboard)
- All Programs (referral / rewards)
- Staff Panel — sirf staff role wale ko
- Admin Panel — sirf admin role wale ko

Rules:
- Admin ke Service Selection toggles respect honge — OFF service kahin nahi dikhegi.
- Role-gated panels (Staff/Admin) sirf us role ke user ko dikhenge.
- Tap = seedha us dashboard par; long-press = APK/link share (jo pehle se hai).
- Chuna gaya panel active workspace ke roop me save hoga, taaki app dobara wahi khole.

## 3. Quick Service home (screenshot 4) ki safai
- Top-right ka **"Join Seller"** button hata denge — dono views (content aur map) se.
- Wahi "Join Seller" entry ab bottom sheet (Quick Menu / Switch Panel) me ek tile ke roop me aayegi.
- Top-left avatar/naam tap karne par wahi ek profile sheet khulegi (menu-bar ka kaam profile ke andar chala jayega); location chip pehle jaisa hi rahega.

## Technical notes
- Naya shared component `src/components/PanelSwitchSheet.tsx`: `SERVICE_CATALOGUE` + role checks (`user_roles` via `has_role`-backed query) se options banayega, `useServiceMenu()` se ON/OFF filter, `writeActiveService()` se choice persist.
- `src/routes/profile.tsx` ka mojooda `ActionPicker`-based Switch Panel isi naye sheet se replace hoga (PANEL_OPTIONS hata denge), taaki ek hi source of truth rahe.
- `src/components/ProfileHubSheet.tsx` (bottom dock ka Quick Menu) bhi same options list use karega + "Join Seller" tile add hoga.
- `src/routes/one-qr.tsx`: header ke left block (avatar + title) ko button banakar `ProfileSheet` (jo `ProfilePage` render karta hai) kholenge; naya `profileOpen` state, mojooda `BusinessProfileSheet` alag rahega.
- `src/routes/quick.tsx`: dono headers se `Join Seller` Link remove; avatar/name `ProfileSheet` open karega instead of `/profile` navigate.
- Koi DB/schema change nahi; sirf frontend + existing RPC/role reads.
