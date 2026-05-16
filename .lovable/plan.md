## Notification & UX Polish — Customer side

### 1. Notification badges on the 4 profile tiles
- Currently bell shows in a separate top header. Remove that placement.
- Show unread count badges **only on the 4 quick-tile buttons** in the profile menu (Orders 📦, Referral 🎁, Bell 🔔, Support 🎧).
- Each badge = bucket count from `useNotifications()`:
  - Orders tile → `counts.orders`
  - Referral tile → `counts.referral`
  - Bell tile → `counts.total` (opens NotificationCenter sheet)
  - Support tile → `counts.support`
- Tapping a tile (other than bell) navigates to that page AND marks that bucket read.

### 2. Home screen — bell badge next to Quick chip
- On `/home`, next to the avatar/search-bar Quick chip, show small notification count (red pill, `counts.total`).
- Tapping it opens the same NotificationCenter sheet.

### 3. My Orders — two sections
Inside `/orders` (and the My Orders sheet), just below the search bar add segmented tabs:
- **Accepted** (default) — leads where vendor accepted (current behavior).
- **Pending / Not accepted** — leads the customer sent but vendor hasn't accepted (still showing other vendors who were shown but didn't respond).
Switch list source based on tab. Use real data from `leads` table filtered by `status`.

### 4. Chat + Stepper screens — 70% sheet with X close
- Chat screen and live status/stepper screen should open as a **bottom sheet covering ~70% of screen** (not fullscreen).
- Top-right corner: small **X button** to close → returns to previous screen (screen-on-screen feel).
- Replace fullscreen route mount with sheet wrapper where these are launched from My Orders / notifications.

### 5. Real data wiring
- Remove any mock/fake entries from My Orders, chat list, and status timeline. Pull from `leads`, `lead_messages`, `vendor_status_updates` tables for the signed-in customer.

### 6. Paytm/PhonePe-style toast notifications
- When a new lead/message/status update arrives (realtime), show a **top-center toast** like "🔔 आपको नई lead मिली — Aryan Bansal से" with sound.
- Implement via sonner `toast()` triggered from `use-notifications` realtime handler.
- Format: `"{Customer name} ne aapko {service} ke liye lead bheji"` for vendor; `"{Vendor name} ne aapka order accept kiya"` for customer; amounts/orders styled bold.

### 7. Sound everywhere an action prompt appears
Wire `playPing()` to these moments:
- Map permission popup shown
- "Allow location" / "Enable notifications" / "Upload KYC" / OTP modal open
- Accept / Reject buttons appearing on vendor side
- Any toast (sonner) fires a short ping
- Hook into `OtpModal`, `PermissionsGate`, `ActionAlertBanner`, `ApprovalCard`, `FindingVendorOverlay` mount effects.

### Technical notes
- Files to edit: `src/routes/profile.tsx` (remove header bell, wire tile badges + onClick mark-read), `src/routes/home.tsx` (add bell-count next to Quick chip), `src/components/MyOrdersList.tsx` (add Accepted/Pending tabs), `src/components/LeadChatThread.tsx` + `src/components/VerticalOrderTimeline.tsx` wrappers (70% sheet + X), `src/hooks/use-notifications.tsx` (emit sonner toast on fresh items), and small `useEffect(() => playPing(), [])` additions in the listed modal/banner components.
- No DB migration required — uses existing tables.
- `NotificationCenter` sheet stays as is (opened from bell tile only).
