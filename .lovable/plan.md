## Marketing Notifications Module (Admin)

Add a new "Campaigns" tab inside the existing **Admin → Notifications** page (`src/routes/admin.notifications.tsx`) so all push tooling lives in one place.

### 1. Database (migration)
- `notification_campaigns` already exists — extend with: `audience_filter jsonb`, `manual_targets jsonb` (list of user_ids/phones), `image_url`, `action_url`, `template_id`, `status`, `sent_count`, `delivered_count`, `failed_count`.
- New `notification_templates` table: `name`, `title`, `body`, `image_url`, `action_url`, `notification_type`, created_by, timestamps. Admin-only RLS.
- Storage bucket `notification-media` (public read) for image uploads.
- RPC `admin_segment_audience(_filter jsonb)` → returns matching `user_id[]` by joining `vendors`/`customers`/`kyc_verifications` (filters: role=vendor|customer|all, city, kyc_status, active_status).
- RPC `admin_send_campaign(_campaign_id uuid)` → resolves audience (filter ∪ manual), loops `device_tokens`, writes `notification_logs`, calls existing FCM sender.
- RPC `admin_get_log_details(_status text, _trigger_id uuid?, _campaign_id uuid?)` → joins logs with profile names/phones for the drawer.

### 2. UI — new tabs added to `admin.notifications.tsx`
- **Campaigns tab**
  - "Create New Campaign" button → bottom-sheet editor with: Title, Body, Image upload (SmartMediaPicker → storage), Action URL, Type, **Save as Template** toggle.
  - **Segmentation card**: Audience type (All / Vendors / Customers), City multi-select (from existing `india-cities`), KYC status (pending/approved/rejected/none), Active status. Live preview count via `admin_segment_audience`.
  - **Manual targets**: textarea to paste user IDs or 10-digit phones (comma/newline separated) — merged with filter result.
  - **Templates** strip: load saved templates into the editor.
  - Send Now / Schedule buttons.
- **Direct Send card** (top of Campaigns tab): single phone/user ID input + "Send Test" — reuses `sendTestPush` with `to_user_id` param.
- **Logs tab enhancement**
  - KPI tiles (Sent/Delivered/Failed) become clickable → open `AdminRecordDrawer` showing data grid: user name, phone, channel, provider, timestamp, error reason. Backed by `admin_get_log_details`.

### 3. Server functions (`src/lib/notification-campaigns.functions.ts`)
- `previewAudience({ filter })` → count + sample
- `createCampaign({...})`, `listCampaigns()`, `sendCampaignNow({id})`
- `listTemplates()`, `saveTemplate({...})`, `deleteTemplate({id})`
- `sendDirectTest({ target, title, body, image_url, action_url })`
- `getLogDetails({ status, campaign_id? })`

All gated with `requireSupabaseAuth` + `has_role(admin)` check. Privileged sends use `supabaseAdmin` loaded inside the handler.

### 4. Files touched
- New: migration, `notification-campaigns.functions.ts`, `src/components/admin/CampaignEditor.tsx`, `src/components/admin/SegmentationPanel.tsx`, `src/components/admin/LogDetailDrawer.tsx`.
- Edited: `src/routes/admin.notifications.tsx` (add Campaigns tab + clickable KPIs + Direct Send).
- Reuses: `SmartMediaPicker`, existing FCM `sendLeadPushToVendorInternal` style helper, `AdminLayout`, `GoldCard`.

### Notes
- Audience preview runs server-side to keep PII out of the browser.
- Image uploads go to the new `notification-media` storage bucket; URL stored on campaign/template.
- Existing Triggers and Analytics tabs remain unchanged.

Shall I proceed with the migration + implementation?
