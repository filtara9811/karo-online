
-- 1) Restrict vendors realtime publication to non-PII columns
ALTER PUBLICATION supabase_realtime DROP TABLE public.vendors;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vendors (
  id, user_id, role, owner_name, entity, trade, deals_in, business_name,
  referral, instagram, facebook, website, plan, is_blocked, status,
  avatar_url, created_at, updated_at, tags, assigned_to, verified,
  google_place_id, auto_accept_leads, service_radius_km, lat, lng,
  current_team_count, van_count, is_online, location_updated_at,
  operation_mode, live_lat, live_lng, is_premium, vendor_type, is_remote_capable
);

-- 2) Tighten realtime topic authorization for lead-scoped topics:
-- only customer, admin, or vendors with an accepted/completed lead_notification.
CREATE OR REPLACE FUNCTION public.realtime_topic_authorized(_topic text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  suffix text;
  lead_uuid uuid;
BEGIN
  IF uid IS NULL OR _topic IS NULL OR _topic = '' THEN
    RETURN false;
  END IF;

  IF _topic = 'admin-alert-banner' THEN
    RETURN public.is_admin_user(uid);
  END IF;

  IF public.is_admin_user(uid) THEN
    RETURN true;
  END IF;

  FOREACH suffix IN ARRAY ARRAY[
    'lead-notif-', 'vendor-leads-', 'vw-strip-',
    'vendor-alert-banner-', 'vendor-bell-', 'vendor-inbox-'
  ] LOOP
    IF _topic = suffix || uid::text THEN
      RETURN true;
    END IF;
  END LOOP;

  FOREACH suffix IN ARRAY ARRAY[
    'finder-accept-', 'lead-status-', 'lead-msg-', 'lead-accepted-'
  ] LOOP
    IF position(suffix in _topic) = 1 THEN
      BEGIN
        lead_uuid := substring(_topic from char_length(suffix) + 1)::uuid;
      EXCEPTION WHEN others THEN
        RETURN false;
      END;
      RETURN EXISTS (
        SELECT 1 FROM public.leads l
        WHERE l.id = lead_uuid
          AND (
            l.customer_id = uid
            OR EXISTS (
              SELECT 1 FROM public.lead_notifications n
              WHERE n.lead_id = lead_uuid
                AND n.vendor_id = uid
                AND n.status IN ('accepted','completed')
            )
          )
      );
    END IF;
  END LOOP;

  IF position('my-orders-' in _topic) = 1 THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$function$;

-- 3) Restrict chat-media read policy to authenticated callers
DROP POLICY IF EXISTS "chat-media participants read" ON storage.objects;
CREATE POLICY "chat-media participants read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-media'
  AND auth.uid() IS NOT NULL
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_admin_user(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id::text = (storage.foldername(objects.name))[1]
        AND (
          l.customer_id = auth.uid()
          OR auth.uid() = ANY (COALESCE(l.accepted_vendor_ids, ARRAY[]::uuid[]))
          OR auth.uid() = l.accepted_vendor_id
        )
    )
  )
);

-- 4) Document coin_transfers INSERT policy as intentional (server-side only).
COMMENT ON TABLE public.coin_transfers IS
  'Inserts intentionally restricted to SECURITY DEFINER functions (accept_lead, transfer_coins) and service_role. No client INSERT policy by design.';
