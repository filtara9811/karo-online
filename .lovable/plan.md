## Scope

Vendor side ko "Uber-driver style" lead alerts dene hain + customer ko 2-way status updates. Kuch points pe **platform reality** clear karni hai pehle, taaki promise aur delivery match karein:

### Platform reality check (zaroori)

App abhi **PWA (web)** hai (no Capacitor/native shell mile codebase mein). Iska matlab:

- ✅ **FCM web push** locked phone pe bhi aata hai (already wired) — high priority set kar sakte hain.
- ⚠️ **20–30 sec loud sound jab app band ho** — browsers/iOS web push pe possible **nahi** hai. Sound sirf tab bajta hai jab app/tab open ya recently active ho. Native Android wrapper (Capacitor + a foreground service + custom notification channel with `sound=...mp3` and `importance=MAX`) chahiye iske liye.
- ⚠️ **Auto-accept jab vendor offline ho** — client-side timer tab nahi chal sakta. Solution: **server-side timer** (pg_cron / scheduled edge call) — vendor online ho ya na ho, 15s ke baad lead auto-accept ho jayegi.

Main isi turn mein **jo web pe possible hai sab** ship karunga + DB/server pieces jo native wrapper aane par directly use ho jayenge.

## Changes

### 1. High-priority push payload + customer-side push
**File:** `src/lib/push.functions.ts`
- FCM payload mein `android.priority="HIGH"`, `android.notification.channel_id="lead_alerts_v2"`, `android.notification.sound="lead_ring"`, `apns.headers["apns-priority"]="10"`, `webpush.headers.Urgency="high"`, `requireInteraction:true`.
- Naya helper `sendLeadPushToVendor(vendorId, lead)` aur `sendStatusPushToCustomer(customerId, status, vendorName)`.

**File:** `public/firebase-messaging-sw.js`
- Show notification with `requireInteraction:true`, `vibrate:[400,150,400,150,800]`, `silent:false`.
- Action buttons: "Accept" and "Reject" (deep-link to `/vendor/dashboard?leadId=...&action=accept`).

### 2. Long alert sound (20–30s loop, while app foregrounded)
**File:** `public/sounds/lead-ring.mp3` (new — generate ~25s loud bell loop with ffmpeg)
**File:** `src/lib/lead-sound.ts`
- Replace Web Audio synth with `<audio>` element loaded from `/sounds/lead-ring.mp3`, `loop=true`, plays for max 30s or until `stopLeadAlert()`.
- Keep vibration loop as a backup.

### 3. 15-second auto-accept (server-side, authoritative)
**Migration:**
- `lead_notifications` me add `auto_accept_at timestamptz` (default `created_at + 15s`).
- New SQL function `auto_accept_expired_lead_notifications()` — for each pending notification where `auto_accept_at < now()` and parent `leads.status='new'`, call existing `accept_lead` logic on behalf of vendor (skip vendors with insufficient coins → mark `expired`).
- `pg_cron` job every 5 seconds calling this function (Cloud already supports pg_cron).

**Client UI** (`LeadAlertStack.tsx`):
- Countdown 15s (not 90s) shown in sheet; on hit-zero just dismiss locally (server has already accepted).
- Show subtitle: "Auto-accept in 15s • Reject to skip".

### 4. Notification content + phone privacy
**Migration:** add SQL helper `mask_phone(text)` → returns `"•••• 4 digits"`.
**File:** `src/hooks/use-vendor-leads.tsx`
- Select `customer_avatar_url, customer_name, distance_km` from `lead_notifications` (already has `distance_km`) — fetch `customer_avatar_url` from `profiles`.
- Mask `customer_phone` everywhere in UI until lead accepted.

**File:** `src/components/LeadAlertStack.tsx`
- Show avatar (circular) + name + `📍 X.X km` + masked phone `•••• 1234`.

### 5. Two-way status pings (vendor → customer)
**Migration:** new table `vendor_status_updates`
- columns: `id, lead_id, vendor_id, status_key text, message text, created_at`
- RLS: vendor of accepted lead can insert; customer of the lead can select.
- Trigger: on insert, queue an FCM push to customer (`send_status_push` server-fn called from server).

**File:** `src/routes/vendor.lead.$id.tsx` (Active Tasks card)
- Add 4 quick-status buttons: "On the way", "Arrived", "Working", "Completed".
- Add big "📞 Call Customer" button (`tel:` link, full number visible after acceptance).
- Tapping a status button → insert row → server fn `sendStatusPushToCustomer` fires FCM.

**File:** `src/hooks/use-customer-status-alerts.ts` (new)
- Subscribes to realtime `vendor_status_updates` for customer's open leads; shows toast + browser notification.

### 6. Vendor "Active Tasks" surface
**File:** `src/routes/vendor.dashboard.tsx`
- Add section "Active Tasks" listing leads where `accepted_vendor_id = me AND status IN ('accepted','in_progress')`.
- Each card: customer avatar, name, distance, masked phone, "Call" + "Chat" + status pills.

## What requires a native wrapper later (documented, not blocking)
- 20–30s loud sound while phone locked / app killed.
- Full-screen incoming-call style notification.

Jab tum bolo, Capacitor wrap karke Android APK build kar denge with a `lead_alerts_v2` channel (importance MAX + custom long sound + bypass DND) — server payload already isi channel ko target karta hai, so zero code change tab.

## Technical details
- FCM payload structured for both Android + APNs + Web so future native wrapper inherits same backend.
- pg_cron schedule: `select cron.schedule('auto-accept-leads', '5 seconds', $$ select public.auto_accept_expired_lead_notifications() $$);`
- Audio file: 25s, 96 kbps mono mp3, ~300 KB; generated locally with ffmpeg sine-bell loop.