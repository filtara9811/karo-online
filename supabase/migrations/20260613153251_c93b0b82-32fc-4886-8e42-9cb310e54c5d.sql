DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'vendors'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.vendors';
  END IF;
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.vendors (
    id, user_id, role, owner_name, entity, trade, deals_in, business_name,
    website, plan, is_blocked, status, avatar_url, created_at, updated_at,
    tags, assigned_to, verified, google_place_id, auto_accept_leads,
    service_radius_km, lat, lng, current_team_count, van_count, is_online,
    location_updated_at, operation_mode, live_lat, live_lng, is_premium,
    vendor_type, is_remote_capable, cover_image_url, cover_video_url
  )';
END $$;