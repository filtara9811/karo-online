## Goal
Add two new admin-managed provider systems following the existing Cashfree/SMS panel pattern — without changing any existing UI.

1. **Firebase Provider Hub** (Auth, FCM Push, Analytics, Crashlytics, Dynamic Links, Remote Config)
2. **Maps Provider Hub** (Google Maps + Mappls India)

Plus a **Notification Engine** that uses FCM with SMS/WhatsApp fallback and trigger automation.

---

## 1. Database (single migration)

### `firebase_services`
Multi-row config table (mirrors `cashfree_services`):
- `service_key` (auth | fcm | analytics | crashlytics | dynamic_links | remote_config)
- `display_name`, `description`
- `server_key`, `service_account_json` (text, encrypted via vault if available)
- `project_id`, `app_id`, `sender_id`, `web_api_key`
- `is_active`, `is_test_mode`, `priority`
- `config jsonb` (per-service extras: VAPID key, dynamic-link domain, etc.)

Seed 6 rows on creation.

### `maps_services`
- `provider` (google_maps | mappls)
- `display_name`, `description`
- `api_key`, `client_id`, `client_secret` (mappls), `rest_key`, `map_sdk_key`
- `assigned_use` (geocoding | nearby | directions | autocomplete | static_map | none)
- `is_active`, `is_test_mode`, `priority`
- `config jsonb`

Seed 2 rows.

### `notification_triggers`
Admin-defined automation:
- `event_key` (order_placed | payment_success | payment_failed | kyc_approved | vendor_approved | referral_reward_released | delivery_assigned | order_delivered + custom)
- `title`, `body`, `image_url`, `action_url` (deep link)
- `notification_type` (basic | banner | big_image | action | silent)
- `channels jsonb` (push, sms, whatsapp flags + fallback order)
- `audience` (user | vendor | topic:<name> | segment:<id>)
- `is_active`, `schedule_at`, `last_fired_at`

### `notification_campaigns`
Manual/bulk campaigns with same fields + `target_segment`, `geo_filter jsonb`, `status`, `sent_count`, `delivered_count`, `failed_count`.

### `notification_logs`
Per-send record: `trigger_id`, `campaign_id`, `user_id`, `device_token`, `provider`, `status` (sent | delivered | failed), `error`, `payload jsonb`, `created_at`.

### `device_tokens`
- `user_id`, `token`, `platform` (web | android | ios), `last_seen_at`, `is_active`, `topics text[]`.

### `user_geo`
- `user_id`, `lat`, `lng`, `accuracy`, `geohash`, `updated_at` (for nearby/geo-fencing).

All admin-only RLS using existing `has_role`. Users can insert/update their own `device_tokens` and `user_geo`.

### RPCs
- `admin_upsert_firebase_service`, `admin_upsert_maps_service`
- `admin_upsert_notification_trigger`, `admin_test_notification`
- `register_device_token`, `update_my_geo`
- `get_notification_analytics` (counts by status/provider/day)

---

## 2. Edge / Server Functions

`src/lib/notifications.functions.ts` (server-only, admin-gated):
- `sendPushToUser(userId, payload)` — picks active FCM service, sends via HTTP v1 API using service-account JWT, logs to `notification_logs`, falls back to WhatsApp/SMS on failure if trigger says so.
- `sendCampaign(campaignId)` — bulk loop with batching.
- `fireTrigger(eventKey, context)` — looked up by event, called from existing flows (orders, payments, kyc, referrals).

`src/lib/maps.functions.ts`:
- `geocode(address)`, `reverseGeocode(lat,lng)`, `nearbyVendors(lat,lng,radius)` — picks active maps provider by `assigned_use` with failover.

Hook `fireTrigger()` calls into existing key flows (no UI change): order placed, payment success/fail, KYC approve, vendor approve, referral reward release in admin RPC, delivery assignment, order delivered.

---

## 3. Admin Panel (new pages, existing layout/styles)

All use `AdminLayout`, `GoldCard`, `PageHeader` exactly like `admin.cashfree.tsx`.

- **`/admin/firebase`** — list of 6 service cards, each with App ID/Server Key/Service Account JSON textarea, Test/Active toggles, priority, Save. Header tip about smart routing.
- **`/admin/maps`** — 2 cards (Google + Mappls), API key + assigned-use selector (Geocoding / Nearby / Directions / Autocomplete / Static Map), Test/Active/Priority, Save.
- **`/admin/notifications`** — 4 tabs:
  1. **Triggers** — table of events, edit drawer (title/body/image/deep link/channels/audience/type), Test-send button.
  2. **Campaigns** — create/schedule bulk push, segment filter, geo filter, run, status.
  3. **Logs** — recent sends with status, provider, error.
  4. **Analytics** — KPI tiles (sent, delivered, failed, CTR), chart by day/provider.
- Add 3 entries to `AdminLayout` sidebar: **Firebase**, **Maps**, **Notifications** (with appropriate lucide icons: Flame, Map, Bell).

---

## 4. Customer-side glue (no visible UI change)

- On app boot (in existing root or auth hook): if Firebase web config exists in `firebase_services` (active), initialize FCM, request permission silently only when user opts-in elsewhere; register token via `register_device_token`.
- Periodic (debounced) `update_my_geo` from existing geolocation hook — store only when user already shared location.
- Deep-link handler reads `notification.data.action_url` and routes via TanStack router.

No changes to existing screens, cards, switches, or flows.

---

## 5. Failover & multi-provider rules
- Push: try active FCM service ordered by priority; on error mark provider unhealthy and fall back per trigger config (SMS via existing SMS panel, WhatsApp via existing provider).
- Maps: per `assigned_use`, pick highest-priority active provider; on 4xx/5xx, try next.
- All errors logged to `notification_logs` / a new `gateway_errors` row reused by existing System Status page.

---

## Files to add
- `supabase/migrations/<ts>_firebase_maps_notifications.sql`
- `src/routes/admin.firebase.tsx`
- `src/routes/admin.maps.tsx`
- `src/routes/admin.notifications.tsx`
- `src/lib/notifications.functions.ts`
- `src/lib/maps.functions.ts`
- `src/lib/firebase-admin.server.ts` (FCM HTTP v1 sender, JWT signing using service account)
- `src/hooks/use-fcm.ts` (browser FCM init + token registration)

## Files to edit
- `src/components/admin/AdminLayout.tsx` — add 3 sidebar links
- Existing flows that should fire triggers (orders/payments/kyc/vendor approve/referral release/delivery) — add 1-line `fireTrigger("event_key", {...})` call

No existing UI/components/cards/switches are modified. Existing referral, wallet, dashboard, sidebar, theme remain untouched.

---

This is a large piece of work (~1 migration + 8 new files + ~6 trigger hookups). Approve and I'll ship in one pass starting with the migration.
