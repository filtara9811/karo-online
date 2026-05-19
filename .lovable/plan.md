
## Goal

जब admin panel में किसी customer या vendor पर click करें, तो उसका **पूरा वही dashboard** खुले जो उसे अपने phone पर दिखता है (Vendor Dashboard / Customer Home + Profile + Orders + Shop + KYC + Wallet + Products), और साथ में admin के पास **A-to-Z controls** हों — approve / disapprove, enable / disable, edit, delete, KYC update, coin add/deduct, products edit, restrictions।

---

## Approach: "Admin View-As" mode

एक नया route `/admin/view/$userId` बनेगा जो एक special "Admin Impersonation Shell" है। ये actual vendor/customer screens को re-use करेगा (कोई duplicate UI नहीं) — एक global `useViewAsUser()` context से ये screens पता करेंगे कि किस user का data दिखाना है।

### Architecture

```text
/admin/view/$userId
 ├── Top bar: Admin Controls (sticky, gold theme)
 │     • Approve/Disapprove • Block/Unblock • KYC ✓/✗
 │     • Coins +/- • Service Balance +/- • Delete user
 │     • Edit Profile • Edit Vendor • Notes
 ├── Tabs: [Customer View] [Vendor View] [KYC] [Wallet] [Products] [Orders] [Shop]
 └── Body: renders the REAL component used by that user
       (VendorDashboard, VendorShop, ProfileSheet, MyOrdersList, etc.)
       wrapped in <ViewAsProvider userId={...}>
```

### Why re-use real screens
- Admin देखता है **exact same UI** जो user को दिखती है — no drift
- नया code minimal — सिर्फ data-source override layer

---

## Technical Implementation

### 1. `ViewAsContext`  (`src/hooks/use-view-as.tsx`)
```ts
// Provides: { viewAsUserId, isAdminViewing, adminUserId }
// useEffectiveUserId() → returns viewAsUserId ?? auth.user.id
```

### 2. Refactor data hooks to use effective user id
Touch these existing hooks to read `useEffectiveUserId()` instead of `auth.user.id`:
- `use-auth.tsx` → add `effectiveProfile` (loads `customers` row for effective uid)
- `use-vendor-leads.tsx`, `use-my-orders.tsx`, `use-cart.tsx`, `use-notifications.tsx`
- `use-fcm-token` skipped (admin shouldn't register tokens)

Pattern: small change, ~3-line edit per hook.

### 3. New admin server functions (`src/lib/admin-impersonate.functions.ts`)
- `getUserFullSnapshot(userId)` → customer + vendor + wallet + kyc + products + recent orders
- `adminEditProduct(productId, patch)`
- `adminDeleteProduct(productId)`
- `adminSetKyc(userId, { gst, pan, aadhaar, verified })`
- `adminApproveVendor(userId)` / `adminDisapproveVendor(userId)`
- (re-use existing `adjustWallet`, `setUserBlock`, `updateCustomerProfile`, `updateVendorProfile`)

All gated by `is_admin_user(auth.uid())`.

### 4. New route `/admin/view/$userId.tsx`
- Sticky **AdminActionBar** (top) with all controls
- Tabs:
  1. **Customer** → renders `<Home>` / `<Profile>` / `<MyOrdersList>` snapshot
  2. **Vendor Dashboard** → renders `<VendorDashboard>` (read-only flag)
  3. **Shop** → `<VendorShop>` view  
  4. **Products** → list with inline edit/delete
  5. **KYC** → editable form (GST/PAN/Aadhaar/Aadhar images, approve/reject)
  6. **Wallet** → balance + transactions + Add/Deduct LeadX coins / service ₹
  7. **Orders / Leads** → list view
- All wrapped in `<ViewAsProvider userId={...}>`

### 5. Wire click-through on admin lists
- `admin.customers.tsx` → click row → `navigate({ to: '/admin/view/$userId', params: { userId: c.user_id } })`
- `admin.vendors.tsx` → same
- `admin.lookup.tsx` → "Open Full Dashboard" button on each result

### 6. Read-only safety
- Vendor screens में check: if `isAdminViewing` → disable lead accept/reject buttons (would mess vendor's real state); show "Admin view-only" badge
- Profile edits / KYC / wallet → go through admin server functions (audit logged)

---

## Files to create
- `src/hooks/use-view-as.tsx`
- `src/lib/admin-impersonate.functions.ts`
- `src/routes/admin.view.$userId.tsx`
- `src/components/admin/AdminActionBar.tsx`
- `src/components/admin/AdminKycEditor.tsx`
- `src/components/admin/AdminProductManager.tsx`

## Files to edit (small surgical edits)
- `src/hooks/use-auth.tsx` — add `effectiveUserId` getter
- `src/hooks/use-vendor-leads.tsx` — use effective uid
- `src/hooks/use-my-orders.tsx` — use effective uid
- `src/routes/admin.customers.tsx` — row click → view route
- `src/routes/admin.vendors.tsx` — row click → view route
- `src/routes/admin.lookup.tsx` — add "Open Dashboard" CTA
- `src/components/VendorDashboard*.tsx` — read-only banner when viewing as admin
- `src/routeTree.gen.ts` — register new route

## Database
No schema changes needed — only new server functions using existing tables.
(Optional: add `admin_audit_log` table later. Skipped for v1 to ship fast.)

---

## Out of scope (ask separately if needed)
- Real Capacitor-style impersonation (logging in as the user) — not safe
- Live admin chat-as-user
- Editing other users' chats / lead conversations

---

## Estimated changes
- 6 new files, 8 edits, no migrations
- Existing screens stay untouched in behavior for normal users — only consume `useEffectiveUserId()` which defaults to auth user

Confirm with **"हाँ, करो"** to proceed.
