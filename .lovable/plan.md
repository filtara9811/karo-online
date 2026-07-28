## A से Z: Staff Dashboard क्या है और कैसे चलता है

**Routes (सब `/staff` layout के अंदर)**
- `src/routes/staff.tsx` — layout + auth gate + bottom nav (Home / Leads / Referral / My Team + big "+" button)
- `src/routes/staff.index.tsx` — Home: earning card, wallet balance, tier (Bronze/Silver/Gold), sell-items grid, promo carousel
- `src/routes/staff.tasks.tsx` — assigned leads/tasks
- `src/routes/staff.wallet.tsx` — referral/earnings + withdrawal
- `src/routes/staff.vendors.tsx` — my team / onboarded vendors
- `src/routes/staff.chat.$chatId.tsx` — chat thread
- `src/routes/staff.login.tsx` — email/password login + signup request

**Backend** — `src/lib/staff.functions.ts` (27 server functions, सब `requireSupabaseAuth` middleware पर): `getMyStaff`, `getMyWallet`, `listMyTasks`, `submitStaffSignup`, invites, withdrawals, chat, categories, top earners. Tables: `staff_profiles`, `staff_wallets`, `staff_wallet_ledger`, `staff_tasks`, `staff_chats`, `user_roles`.

## Blank screen की असली वजह (confirmed)

`src/routes/staff.tsx` का gate:
1. session नहीं → `navigate({ to: "/staff/login" })`, पर `checking` कभी `false` नहीं होता।
2. `/staff/login` खुद इसी `/staff` layout का child है — और layout `checking === true` पर सिर्फ spinner दिखाता है, `<Outlet />` render ही नहीं करता।
3. नतीजा: login page कभी mount नहीं होता → हमेशा घूमता spinner (आपका screenshot)।

यही तब भी होता है जब user logged-in तो है पर `staff` role नहीं है (customer account): code `signOut()` करके `/staff/login` भेजता है → वही अनंत spinner।

## Fix plan

1. **Login route को gate से बाहर रखें** — `staff.tsx` में: अगर `pathname === "/staff/login"` (या `/staff/s/onboard`) हो तो gate skip करके सीधे `<Outlet />` render करो, bottom nav के बिना।
2. **Gate को हर हाल में terminate करो** — redirect करने से पहले भी `setChecking(false)` सेट करें, और `try/catch/finally` लगाएँ ताकि Supabase call fail होने पर भी spinner अटके नहीं।
3. **Role-less user के लिए साफ़ message** — logged-in पर staff role नहीं है तो चुपचाप signOut करने के बजाय एक छोटा card: "यह account staff नहीं है" + "Staff login" / "Home" buttons (अभी main app session भी log out हो जाता है, जो side-effect है)।
4. **Timeout guard** — 8s के बाद spinner की जगह retry वाला fallback, ताकि network hang पर भी blank न दिखे।
5. **staff.index.tsx robustness** — `Promise.all` में कोई एक call 401/throw करे तो पूरा data गायब हो जाता है; per-call catch + error banner ("Staff profile नहीं मिला — admin approval pending") जोड़ें, ताकि pending staff को खाली screen न मिले।
6. Fix के बाद असली flow verify: logged-out → `/staff` → login page दिखे; staff login → dashboard data (wallet/tasks) असली DB से आए।

## Technical notes

- कोई DB/schema बदलाव नहीं; सिर्फ frontend gate logic। Server functions और RLS वैसे ही रहेंगे।
- File touched: `src/routes/staff.tsx` (मुख्य), `src/routes/staff.index.tsx` (error handling)।
