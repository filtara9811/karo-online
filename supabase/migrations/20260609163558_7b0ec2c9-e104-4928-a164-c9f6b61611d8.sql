
-- 1) app_settings: replace permissive authenticated SELECT with whitelist + admin
DROP POLICY IF EXISTS "Authenticated can view app settings" ON public.app_settings;
CREATE POLICY "Authenticated can view safe app settings"
  ON public.app_settings FOR SELECT TO authenticated
  USING (
    key = ANY (ARRAY['social_links','no_vendor_state','lead_defaults','vendor_app'])
    OR public.is_admin_user(auth.uid())
  );

-- 2) chat-media bucket: enforce per-user folder ownership
DROP POLICY IF EXISTS "chat-media authenticated read" ON storage.objects;
DROP POLICY IF EXISTS "chat-media authenticated insert" ON storage.objects;
CREATE POLICY "chat-media owner read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "chat-media owner insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "chat-media owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "chat-media owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3) test_accounts: explicit admin-only SELECT
DROP POLICY IF EXISTS "Admins read test accounts" ON public.test_accounts;
CREATE POLICY "Admins read test accounts"
  ON public.test_accounts FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- 4) vendors_public view: ensure security_invoker so RLS of querying user applies
ALTER VIEW public.vendors_public SET (security_invoker = true);

-- 5) vendors realtime: limit columns broadcast (drop & re-add with column list)
ALTER PUBLICATION supabase_realtime DROP TABLE public.vendors;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vendors
  (id, user_id, role, owner_name, entity, trade, deals_in, business_name,
   plan, is_blocked, status, avatar_url, created_at, updated_at, tags,
   assigned_to, verified, google_place_id, auto_accept_leads,
   service_radius_km, lat, lng, current_team_count, van_count, is_online,
   location_updated_at, operation_mode, live_lat, live_lng, is_premium,
   vendor_type, is_remote_capable);
