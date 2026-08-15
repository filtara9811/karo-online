# YouTube Data API v3 Integration + Google API Audit

## Part 1 — YouTube channel/playlist feed (priority)

Merchant apni YouTube Channel ID ya Playlist ID paste karega, aur uske Shorts/videos automatically landing page (`/s/{code}`) ke feed me aa jayenge — manually uploaded videos ke saath mixed (hybrid).

### Kaam kya hoga

1. **API key backend me store** — aapki di gayi key `YOUTUBE_API_KEY` naam se secret ke roop me save hogi (browser me kabhi expose nahi hogi). Aap key chat me bhej chuke hain, isliye approve karte hi main use secret me daal dunga aur suggest karta hoon ki Google Cloud me is key par "YouTube Data API v3 only" restriction laga dein.
2. **Video studio me naya field** — "YouTube Channel / Playlist sync" input (Channel ID, `@handle`, ya playlist link/ID chalega) + "Sync now" button + on/off toggle. Yeh setting merchant ke landing settings ke saath save hogi.
3. **Server function** (`src/lib/youtube.functions.ts`) — key server side par rehkar YouTube Data API v3 call karega:
   - handle/channel → uploads playlist resolve
   - `playlistItems.list` se 50 videos per page + `pageToken` se next page
   - response cache (short TTL) taaki quota bache
4. **Infinite scroll** — landing feed end ke paas pahunchne par next page fetch, phir seamless loop (aapka existing loop behaviour intact).
5. **Hybrid feed** — manually uploaded videos pehle, uske baad YouTube videos; dono ek hi loop-safe embed player use karenge (koi replay overlay, koi black flash nahi).
6. **Products** — YouTube se aayi videos par bhi products tag kiye ja sakenge (video ID ke against mapping), studio me hi.

### Technical notes

- Server fn public read hai (shopper landing anonymous hai), isliye rate-limit + input validation (Zod) + sirf zaroori fields return honge.
- Quota: 1 playlist page ≈ 1 unit; caching se daily 10k quota me aaram se chal jayega.

## Part 2 — Google APIs: kaun active, kaun missing (Hindi)

### Abhi project me ACTIVE hai

| API | Status | Role |
|---|---|---|
| **Geocoding API** | ✅ chal rahi hai (`geocodeFn`, `reverseGeocodeFn`) | Address → lat/lng aur lat/lng → address. Vendor/customer ka address save karne aur "meri location" detect karne me. |
| **Places API (Autocomplete + Details)** | ✅ chal rahi hai (`placesAutocompleteFn`, `placeDetailsFn`, `PlacesAutocomplete`) | Address type karte waqt suggestions (India-biased), aur select karne par exact coordinates. |
| **Distance Matrix API** | ✅ chal rahi hai | Customer se vendor ki doori aur time (0-1km radar/nearby vendors). |
| **Directions API** | ✅ chal rahi hai | Route/polyline + turn-by-turn navigation. |
| **Maps JavaScript SDK** | ✅ map screens me | Home screen ka map view. |

Yeh sab ek hi server key `GOOGLE_MAPS_SERVER_KEY` se chalti hain (server se, kyunki REST endpoints referrer restriction support nahi karte).

### MISSING / enable karna hoga

| API | Status | Kyun chahiye |
|---|---|---|
| **YouTube Data API v3** | ❌ abhi nahi (is plan me add hogi) | Channel/playlist se automatic video feed. |
| **Google Business Profile API** | ❌ nahi hai | Merchant ka GMB account connect karke reviews, rating, business hours, photos landing page par dikhane ke liye, aur GMB posts/updates sync karne ke liye. **Note:** yeh API sirf API key se nahi chalti — Google se **OAuth + separate access approval (application form)** chahiye hoti hai, approval me kuch hafte lag sakte hain. Isliye ise alag phase me karna theek rahega. Filhaal landing page par GMB **link/icon** kaam kar raha hai (bas data pull nahi hota).
| **Places API — Nearby Search** | ⚠️ partial | Agar aap chahte hain ki app khud aas-paas ki dukanein Google se dhoonde (jab tak aapke apne vendors kam hain), to Nearby Search enable karni padegi. |

### Google Cloud me aapko sirf yeh karna hai

1. YouTube Data API v3 → **Enable**
2. Nayi key (jo aapne di) par restriction: **API restrictions → YouTube Data API v3**
3. Purani `GOOGLE_MAPS_SERVER_KEY` par: Geocoding, Places, Distance Matrix, Directions, Maps JavaScript — sab enabled hone chahiye
4. Billing account attached hona chahiye (warna REST APIs `REQUEST_DENIED` deti hain)

## Scope note

Is plan me Part 1 build hoga + Part 2 ka audit (koi code change nahi). Google Business Profile integration alag plan me, aapke OAuth approval ke baad.
