# One QR Dashboard — Real Live Analytics + Smart Visitor Feed

Same UI as now (cream project card, QR analytics block, visitor list, bottom dock). Only the insides get real data, count-up animations, a tappable day strip, and true traffic-source icons.

## 1. Three animated analytics cards

Replace the current 2-tile mini stats inside the "QR analytics" block with 3 horizontal soft-shadow cards, each with a Framer Motion 0 → value count-up:

- Visitors: today's visitors (big number) + Total lifetime visits, Unique visitors, Downloads (PWA installs).
- Customers: today's customers + Total customers, Feedback count, Inquiry count.
- Earnings & Orders: today's earnings + Total orders, Pending, Average order value.

Everything comes from real rows for the signed-in merchant: landing visits, QR events (store view, install, product enquiry, order, payment) and shop threads (inquiry vs order, pending status). No mock numbers — a metric with no data shows 0.

## 2. Interactive day timeline

The existing 7-day bar row becomes tappable. Tapping a bar (Fri, Sat, …) selects that day and every number in the three cards animates to that day's values; the range chips (days / 30 / 90) still switch the window, and "Today" is the default selection.

## 3. Activity feed for Landing page visitors

Same list position and style, upgraded:

- Avatar + large bold name, time on the right.
- Sub-line: location when we know it (matched from the visitor's phone in the customer records), plus a small source badge on the avatar.
- Source badge is real: QR scan, direct link, or Instagram / YouTube / Facebook / WhatsApp when the visit came through that platform's link.
- Right side: "Inquiry" / "Order" badges with the product thumbnail and a count when the visitor asked about specific items.
- Call/chat buttons removed from the row; tapping the row still opens the existing visitor thread sheet.

## 4. Making the source icons truthful

Today every visit is stored as "qr", so social sources cannot be shown yet. We start tagging them:

- Shop links shared to Instagram / YouTube / Facebook / WhatsApp carry a source tag in the URL, and the landing page records it with the visit.
- Existing visits without a tag keep the QR icon.

## 5. Smooth scroll + guided help

- All count-ups and bar/badge entrances use Framer Motion springs, GPU-only transforms, and respect reduced-motion; lists render with stable keys so scrolling stays glitch-free.
- The analytics block gets a short "How to read this" guide tap (uses the existing tutorial-video sheet pattern) explaining visitors vs customers vs earnings.

## Technical notes

- New DB work: add `medium` (text, nullable) + `city` (text, nullable) to `referral_link_visits`; extend `log_referral_visit` to accept and store the medium; new SECURITY DEFINER RPC `get_qr_dashboard_analytics(_project, _from, _to)` returning daily buckets and totals aggregated from `referral_link_visits`, `qr_events`, `shop_threads`, `feedback_reports`, plus an owner-scoped `get_qr_visitor_feed(_project, _limit)` returning each visitor group with source/medium, city and their inquiry/order products. Both scoped to `auth.uid()` as the owner; GRANT EXECUTE to `authenticated`.
- Frontend: new `src/components/oneqr/AnalyticsCards.tsx` (count-up cards), day selection state lifted into `QrAnalyticsChart.tsx`, `VisitorFeedRow` extracted from `QrProjectCard.tsx`, source-icon map in `src/lib/qr-track.ts` helpers, and `?src=` tagging added where shop links are shared.
- No layout, colour or dock changes; existing sheets (`VisitorChatSheet`, `ShopChatsSheet`) stay as-is.
