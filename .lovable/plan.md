## Finding

`vendors_realtime_pii_columns` — scanner warns the `vendors` table is published to `supabase_realtime` without a column allowlist, leaking PII (aadhaar, pan, gst, email, whatsapp, manager_email, admin_notes…).

## Reality in the DB

`pg_publication_tables` for `vendors` already publishes only a 29-column safe allowlist:

```text
id, user_id, role, owner_name, entity, trade, deals_in, business_name,
website, plan, is_blocked, status, avatar_url, created_at, updated_at,
verified, google_place_id, auto_accept_leads, service_radius_km,
current_team_count, van_count, is_online, location_updated_at,
operation_mode, is_premium, vendor_type, is_remote_capable,
cover_image_url, cover_video_url
```

None of `aadhaar, pan, gst, email, whatsapp, manager_email, admin_notes, phone, lat, lng, live_lat, live_lng` are in the publication. The earlier migration also installed `public.assert_realtime_publication_columns()` as a drift guard for exactly this set.

So the PII is **not** being broadcast — the scanner can't introspect the column allowlist on the publication and is flagging the table-level membership only.

## Plan

1. Add a one-migration hardening step: explicitly re-set the column allowlist with `ALTER PUBLICATION supabase_realtime SET TABLE public.vendors (…safe cols…)` so the intent is recorded in migration history (idempotent, no behavior change), and run `SELECT public.assert_realtime_publication_columns()` at the end to fail loudly if anything drifts.
2. Mark the finding fixed via `security--manage_security_finding` with an explanation pointing at the allowlist + drift guard.
3. Update `mem://security-memory.md` with a short note: "vendors realtime publication is column-filtered; PII columns must never be added — drift guard enforces it."

No application code changes; this is purely a database invariant restatement plus scanner bookkeeping.
