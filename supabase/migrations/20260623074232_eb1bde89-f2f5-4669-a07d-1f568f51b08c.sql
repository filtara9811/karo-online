-- Re-assert column allowlist on vendors realtime publication (idempotent, no behavior change).
-- PII (aadhaar, pan, gst, email, whatsapp, manager_email, admin_notes, phone, lat/lng, live_lat/lng) is intentionally excluded.
ALTER PUBLICATION supabase_realtime SET TABLE public.vendors (
  id, user_id, role, owner_name, entity, trade, deals_in, business_name,
  website, plan, is_blocked, status, avatar_url, created_at, updated_at,
  verified, google_place_id, auto_accept_leads, service_radius_km,
  current_team_count, van_count, is_online, location_updated_at,
  operation_mode, is_premium, vendor_type, is_remote_capable,
  cover_image_url, cover_video_url
);

-- Fail loudly if drift is ever introduced.
SELECT public.assert_realtime_publication_columns();