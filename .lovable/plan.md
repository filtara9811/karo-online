
# Staff Panel v1 — WhatsApp-style Field Ops Dashboard

Yeh Staff Panel Switch Panel screen में "SOON" वाला 4th option unlock करेगा। Admin staff onboard करेगा, tasks/categories assign करेगा, staff field में vendors onboard करेगा (existing Smart Scanner flow reuse), chat करेगा, aur task/salary basis पर payout claim करेगा.

## 1. Database (migration)

**`public.staff_profiles`** already exists (16 cols) — extend, don't duplicate:
- add `employee_code text unique`, `status` enum (`pending`, `active`, `suspended`, `soon`), `payout_model` enum (`per_task`, `monthly`, `hybrid`), `monthly_salary_inr numeric`, `joined_at`, `approved_by uuid`, `approved_at`

**New tables:**
- `staff_signup_requests` — self-signup queue (name, phone, email, password_hash via Supabase auth signup, requested_at, reviewed_by, decision)
- `staff_category_assignments` — `staff_id`, `category_id`, `can_onboard bool`, `can_edit bool`  (admin decides per staff)
- `staff_permissions` — `staff_id`, permission keys (`onboard_vendor`, `edit_vendor`, `chat_vendor`, `view_leads`, `withdraw_payout`, etc.) as bool columns OR jsonb — jsonb chosen for flexibility
- `staff_tasks` — `id`, `staff_id`, `title`, `type` (`vendor_onboarding`, `verification`, `follow_up`, `custom`), `vendor_id` (fk nullable), `amount_inr numeric`, `status` (`assigned`, `in_progress`, `submitted`, `approved`, `rejected`, `paid`), `assigned_by`, `assigned_at`, `completed_at`, `proof_urls jsonb`
- `staff_wallets` — `staff_id`, `balance_inr`, `lifetime_earned`, `lifetime_withdrawn`, `updated_at`
- `staff_wallet_ledger` — every credit/debit (task_earned, salary_credit, withdrawal, adjustment) with `ref_id`
- `staff_withdrawal_requests` — `staff_id`, `amount_inr`, `upi_id`, `status` (`pending`, `approved`, `paid`, `rejected`), `admin_note`, timestamps
- `staff_chats` — `id`, `type` (`direct`, `group`, `vendor_thread`, `broadcast`), `vendor_id` (nullable), `created_by`, `title`
- `staff_chat_members` — `chat_id`, `user_id`, `role` (`admin`, `member`), `last_read_at`, `muted_at`
- `staff_chat_messages` — `id`, `chat_id`, `sender_id`, `body text`, `attachments jsonb`, `reply_to`, `sent_at`, `edited_at`, `deleted_at`

All tables: RLS ON, GRANT to `authenticated` + `service_role`, policies via `has_role('admin')` or `staff_id = auth.uid()` (never recursive; use `has_role` security-definer).

Add `app_role` enum value `'staff'` (if not present) to `user_roles`.

## 2. Auth Flow (Both options)

- **Admin creates**: Admin form → creates `auth.users` via `supabaseAdmin.auth.admin.createUser` (email + generated password) → inserts `user_roles` row (`staff`) → inserts `staff_profiles` (status=`active`) → shows credentials to admin once (copy button)
- **Self-signup**: `/staff/signup` public route → standard `supabase.auth.signUp` → row goes into `staff_signup_requests` (status pending) → admin approves in Admin > Staff > Requests → on approve: grants `staff` role + creates `staff_profiles`
- Login at `/staff/login` (email + password). Route guard: `_authenticated` layout + `has_role('staff')` check.

## 3. Staff Dashboard (WhatsApp-style UI)

Route: `/staff` (protected). Mobile-first (matches existing design language).

**Bottom tabs (WhatsApp style):**
1. **Chats** — chat list (direct + groups + vendor threads), unread badges, last message preview, timestamps, search bar, FAB for new chat
2. **Vendors** — assigned categories tabs (chips), "Onboard New" button opens existing Smart Scanner sheet, list of vendors staff onboarded (with per-vendor chat thread entry point)
3. **Tasks** — assigned tasks list (filter: assigned/in-progress/submitted/paid), each row shows amount + status pill; tap → detail with proof upload
4. **Wallet** — balance card (big), lifetime earned/withdrawn, ledger list, "Withdraw" CTA → UPI form → creates withdrawal request

**Chat screen** — bubbles (green tint like WhatsApp), text/image/voice attachments (voice = future placeholder), status ticks, typing indicator (realtime via Supabase channel).

**Vendor thread** — auto-created when staff onboards a vendor; admin auto-added; notes/status updates live here.

## 4. Admin — Staff Management

New admin route `/admin/staff`:
- **Overview**: total staff, active, pending requests, monthly payout summary
- **Staff list** table: name, code, status, categories, tasks completed, wallet balance, actions (edit / suspend / delete)
- **Create Staff** modal (admin-creates flow)
- **Signup Requests** tab: approve/reject
- **Assign Categories** drawer per staff (multi-select from `categories` tree)
- **Permissions** drawer per staff (toggle switches)
- **Tasks Board**: create task (assign to staff, link vendor, set amount, deadline), bulk assign
- **Payouts** tab: pending withdrawals → approve/mark paid (records UTR), payout history, per-staff monthly salary toggle + amount
- **Broadcasts**: send announcement to all staff or group

## 5. Payout Engine (Hybrid)

- Admin sets `payout_model` per staff. `per_task` → wallet credited on task approve. `monthly` → cron/scheduled server fn credits salary on 1st. `hybrid` → both.
- Task amount set per-task by admin, OR from `task_type_rates` (optional future).
- Withdrawal: staff requests → wallet debited on approve → admin marks paid (records UTR).
- Ledger for audit trail; wallet balance = view/sum from ledger.

## 6. Files to Create/Edit

**Migration** (1 file): all tables + RLS + `staff` role + triggers (auto-create wallet on staff_profiles insert; auto-credit ledger on task approve).

**Server functions** (`src/lib/staff/*.functions.ts`):
- `staff-auth.functions.ts` — createStaff, listStaff, approveSignup, updatePermissions
- `staff-tasks.functions.ts` — createTask, listMyTasks, submitTask, approveTask
- `staff-wallet.functions.ts` — getBalance, requestWithdrawal, listLedger, approveWithdrawal
- `staff-chat.functions.ts` — listChats, sendMessage, markRead, createVendorThread
- `staff-categories.functions.ts` — assignCategories, listMyCategories

**Routes:**
- `/staff/signup`, `/staff/login` (public)
- `/_authenticated/staff/` layout with bottom-tab shell
  - `index.tsx` (Chats), `vendors.tsx`, `tasks.tsx`, `wallet.tsx`
  - `chat.$chatId.tsx`, `task.$taskId.tsx`
- `/_authenticated/admin/staff/` — index, requests, tasks, payouts, broadcasts, `$staffId.tsx` (detail)

**Components** (`src/components/staff/`):
- `StaffBottomNav.tsx`, `ChatList.tsx`, `ChatBubble.tsx`, `ChatComposer.tsx`, `VendorList.tsx`, `TaskCard.tsx`, `WalletCard.tsx`, `WithdrawSheet.tsx`, `StaffCategoryChips.tsx`
- Admin: `CreateStaffModal.tsx`, `SignupRequestsTable.tsx`, `AssignCategoriesDrawer.tsx`, `PermissionsToggles.tsx`, `TaskAssignBoard.tsx`, `PayoutsTable.tsx`, `BroadcastComposer.tsx`

**Switch Panel** — unlock 4th option: `/routes/panel.tsx` or wherever it lives → remove "SOON" badge for users with `staff` role, route to `/staff`.

## 7. Design tokens

WhatsApp-inspired but on-brand:
- Chat bubble bg (sent): `hsl(var(--primary) / 0.15)` with primary text
- Bubble bg (received): `hsl(var(--muted))`
- Unread badge: primary
- Bottom nav: existing gold/cream palette (matches Switch Panel screenshot), active tab uses gold underline
- Green accent only for status ticks & online dot

## 8. Realtime

Supabase realtime channel per chat_id for messages + typing. Presence for online status. `useChatSubscription(chatId)` hook.

## 9. Phasing (single ship)

All above ships together. No feature flag — this is v1 unveil. Future items (offline chat sync, voice notes, staff app APK build, attendance geo-fence) tracked separately.

## 10. Open items handled

- Vendor category segregation: per-staff assignment via `staff_category_assignments` + `staff_permissions.jsonb` (admin decides per staff — matches your answer)
- Chat scope: full chat list + vendor-wise threads (matches your answer)
- Auth: both admin-create + self-signup+approval (matches your answer)
- Payout: hybrid model with per-staff toggle (matches your answer)

Approve karein toh main build shuru karta hoon. Migration pehle jayegi (needs approval), fir server fns + UI parallel me.
