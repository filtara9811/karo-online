# Staff Panel + Vendor Onboarding — Complete Build & Test Plan

Scope: Admin ke andar full Staff Ops dashboard, staff app ke andar simple invite→login→onboard→wallet→chat flow, onboarding background video toggle, aur Playwright se end-to-end testing so aap khud verify kar sako.

## 1. Blank/confusing screens fix

**Customer home (screenshot 1)** — top header par sirf "Welcome / RESELLING | AFFILIATE" strip visible hai, avatar overlap ho raha hai, aur search bar upar nazar aa rahi hai. Fix:
- Header ko compact karenge: avatar left, "Welcome, {name}" center, cart right — single row, no overlap.
- "RESELLING | AFFILIATE" strip hata ke sirf logged-in user ke role-specific chip dikhayenge.
- Stats strip (Rating/Reviews/Happy/Service) horizontal scroll fix + last chip cut-off fix.

**Admin sidebar (screenshots 2–6)** — "Staff & Roles" hai but koi dedicated dashboard/insight nahi. Fix:
- Sidebar me naya group **"👥 Staff Ops"** add: sub-items → Dashboard, Invites, Signup Requests, Category Lock, Withdrawals, Insights, Chat.

## 2. Admin → Staff Ops (naya complete dashboard)

Route: `/admin/staff-ops` (already partially exists — expand karenge with tabs)

Tabs:
1. **Dashboard** — total staff, active today, pending approvals, pending withdrawals, today's scans graph.
2. **Invites** — Name + Mobile + Category select → generates deep link → 1-click WhatsApp/SMS/Copy.
3. **Signup Requests** — self-signup queue → Approve/Reject button → account instantly activates.
4. **Staff List** — har staff card: avatar, name, mobile, assigned categories, today's scans, wallet balance, block/unblock.
5. **Category Lock** — per-staff multi-select category assignment (garment, electronics etc.) — `staff_category_assignments` table already exists.
6. **Withdrawals** — pending withdrawal requests → Approve/Reject → wallet ledger auto-update.
7. **Insights** — today's/week's scans bar chart, top performers, OCR confidence avg.
8. **Chat** — WhatsApp-style thread list with each staff.

## 3. Staff App (simple mobile UI)

Bottom tabs (already scaffolded): **Chats · Vendors · Tasks · Wallet**

Improvements:
- **Login/Signup** — sirf Name + Mobile + OTP (Password optional). "Request access" fallback bhi.
- **Vendors tab** → "Onboard" button → **camera modal**:
  - Upto 5 photos ek saath capture/upload.
  - OCR (already `ocr.functions.ts`) → auto-fill business name / phone / address.
  - Confidence score: green (>75%), amber (50–75%), red (<50%).
  - Manual edit allowed on every field.
  - Map pin auto-set from geolocation, draggable.
  - Duplicate check by phone + shop-name similarity → toast "Data already collected".
  - Offline mode: IndexedDB queue (`offline/queue.ts` already exists) → auto-sync when online.
- **Tasks tab** — assigned tasks list, mark complete → wallet credit on admin approval.
- **Wallet tab** — balance, ledger, **Withdraw** button → request goes to admin.
- **Chats tab** — realtime staff↔admin thread (Supabase realtime on `staff_chat_messages`).

## 4. Onboarding background video toggle

Currently video probably hardcoded in vendor onboarding. Fix:
- Add row in `app_settings`: `vendor_onboarding_video_url`, `vendor_onboarding_video_enabled`.
- Admin panel → **Onboarding Screens** page → new "Background Video" section: URL input + enable toggle + preview.
- Vendor onboarding page reads setting; if disabled → static gradient bg.

## 5. Database (single migration)

Additions only (most tables already exist):
- `app_settings` rows: video URL + enabled flag.
- Trigger: on `staff_tasks.status = 'approved'` → auto insert into `staff_wallet_ledger` with task amount.
- Trigger: on `staff_signup_requests.status = 'approved'` → auto insert `user_roles(staff)` + activate `staff_profiles`.
- RLS + GRANTs verified for all staff_* tables.

## 6. Playwright end-to-end tests

Sandbox me headless Chromium run karke ye 6 flows verify karenge, screenshots ke saath (`/tmp/browser/staff/*.png`):

1. **Admin invite → staff onboard**: admin login → create invite → copy link → open in fresh context → signup → auto-role assign → land on `/staff`.
2. **Self-signup approval**: staff signup → admin sees request → approve → staff can login.
3. **OCR onboarding**: mock file upload → confidence colors visible → edit field → save vendor.
4. **Duplicate check**: onboard same phone twice → alert shows.
5. **Offline queue**: `context.setOffline(true)` → save → visible in Scan History → `setOffline(false)` → auto-sync → appears in admin panel.
6. **Wallet withdraw**: task approve → balance increase → withdraw request → admin sees it.
7. **Realtime chat**: 2 browser contexts (admin + staff) → message → appears on other side <1s.

Failing flows will be fixed in the same turn.

## Out of scope (is turn me nahi)
- Native APK build (already documented in `CAPACITOR_BUILD.md`).
- iOS variants.
- Play Store listing text.
- Advanced insights (funnel, cohort) — sirf basic bar chart.

## Deliverable
Aap `/admin/staff-ops` khol ke sab kuch use kar payenge, staff mobile UI se onboarding kar payenge, aur main ek `TEST_REPORT.md` bhi generate karunga jisme har checklist item ka pass/fail + screenshot link hoga.
