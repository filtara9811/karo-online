
-- 1) Tighten realtime topic authorization: my-orders-<uid> must match caller's uid exactly
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
    'vendor-alert-banner-', 'vendor-bell-', 'vendor-inbox-',
    'my-orders-'
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

  RETURN false;
END;
$function$;

-- 2) chat-media read: only verified lead participants or admins.
-- Files are stored at "<lead_id>/<filename>"; verify the first path segment
-- corresponds to a lead the caller participates in.
DROP POLICY IF EXISTS "chat-media participants read" ON storage.objects;
CREATE POLICY "chat-media participants read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-media'
  AND auth.uid() IS NOT NULL
  AND (
    public.is_admin_user(auth.uid())
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
