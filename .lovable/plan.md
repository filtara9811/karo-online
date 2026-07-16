## Goal
App खोलते ही customer को TikTok-style UI दिखे (जो अभी `/quick` पर बना है)। यानी home route `/` पर वही UI render हो।

## Root cause of the confusion
- अभी `/` = marketing landing page (`src/routes/index.tsx`)
- नया UI `/quick` पर बना है
- `AppShell.tsx` में `MARKETING_EXACT` set में `/` है, जिसकी वजह से `/` पर सारा app chrome bypass होता है और marketing layout render होता है
- इसलिए user को home पर पुराना/reselling UI ही दिखता रहा

## Changes

1. **`src/routes/index.tsx`** — पूरा content replace करके `QuickPage` (जो `src/routes/quick.tsx` में है) को यहाँ render करें। दो तरीके:
   - **Option A (recommended):** `quick.tsx` की page body को एक shared component `src/components/pages/QuickHome.tsx` में निकालें। फिर `index.tsx` और `quick.tsx` दोनों वही component render करें। इससे duplication नहीं होगी।
   - Head metadata (`title`, `description`) home-appropriate रखें।

2. **`src/components/AppShell.tsx`**
   - `MARKETING_EXACT` से `"/"` हटाएँ ताकि home पर app chrome (auth gate, dock etc.) चले।
   - `HIDE_TOP_HEADER_ON` में `"/"` (exact match) add करें ताकि map wali screen पर top header न आए।
   - `SHOW_FLOATING_DOCK_ON` में `"/"` add करें ताकि नीचे wala 3-slot dock home पर भी दिखे।
   - `isQuickRoute` जैसी conditions को `pathname === "/" || pathname.startsWith("/quick")` तक extend करें (padding / no-footer logic)।

3. **Marketing landing page preservation** — पुराना marketing content किसी को publicly चाहिए हो सकता है, इसलिए उसे `src/routes/welcome.tsx` (route `/welcome`) पर move कर दें। SEO के लिए `head()` वहीं रहेगा। अगर user कहे तो पूरी तरह delete भी कर सकते हैं।

4. **Navigation cleanup** — किसी `Link to="/"` जो marketing के लिए था उसे `to="/welcome"` कर दें (footer के "Home" link वगैरह)। Bottom nav / customer menu में जो "Home" जाता है वो `/` (यानी नया UI) पर ही रहे।

5. **Verify "flash then revert" fix**
   - `AuthGate` redirect chains check करें — unauthenticated user को home पर auth screen नहीं दिखनी चाहिए, या दिखे तो सिर्फ overlay के तौर पर (map + UI behind रहे)।
   - Ensure कोई `useEffect` `navigate({ to: "/welcome" })` या ऐसा auto-redirect नहीं है।

## Files to touch
- `src/routes/index.tsx` (replace body)
- `src/routes/quick.tsx` (import shared component or keep as alias)
- `src/components/pages/QuickHome.tsx` (NEW — extracted component)
- `src/components/AppShell.tsx` (route lists)
- `src/routes/welcome.tsx` (NEW — old marketing content moved)
- footer / any `Link to="/"` marketing references — spot fix

## Out of scope
- कोई backend / DB / lead-flow change नहीं
- `/quick` route delete नहीं होगा (backward compatibility के लिए रहने दें, वही UI serve करेगा)
- Vendor / admin / staff routes untouched
