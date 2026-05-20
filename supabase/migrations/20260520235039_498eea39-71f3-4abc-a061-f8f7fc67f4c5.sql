
-- Fix 1: Restrict referral_settings reads to admins only (was readable by every authenticated user, exposing fraud thresholds)
DROP POLICY IF EXISTS "rset_public_read" ON public.referral_settings;
DROP POLICY IF EXISTS "Admins read referral_settings" ON public.referral_settings;
CREATE POLICY "Admins read referral_settings"
ON public.referral_settings
FOR SELECT
TO authenticated
USING (public.is_admin_user(auth.uid()));

-- Fix 2: Restrict realtime topic subscriptions so PII / private chat / vendor bids
-- can only stream to parties of the relevant lead, and per-user topics only to
-- their owner. Topic naming conventions live in src/{hooks,components,routes}.
CREATE OR REPLACE FUNCTION public.realtime_topic_authorized(_topic text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  suffix text;
  lead_uuid uuid;
BEGIN
  IF uid IS NULL OR _topic IS NULL OR _topic = '' THEN
    RETURN false;
  END IF;

  -- Admin-only banner
  IF _topic = 'admin-alert-banner' THEN
    RETURN public.is_admin_user(uid);
  END IF;

  -- Admins can subscribe to anything
  IF public.is_admin_user(uid) THEN
    RETURN true;
  END IF;

  -- Per-user topics: prefix-${uid}
  FOREACH suffix IN ARRAY ARRAY[
    'lead-notif-', 'vendor-leads-', 'vw-strip-',
    'vendor-alert-banner-', 'vendor-bell-', 'vendor-inbox-'
  ] LOOP
    IF _topic = suffix || uid::text THEN
      RETURN true;
    END IF;
  END LOOP;

  -- Lead-scoped topics: prefix-${leadId}
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
          AND (l.customer_id = uid OR uid = ANY (COALESCE(l.accepted_vendor_ids, ARRAY[]::uuid[])))
      );
    END IF;
  END LOOP;

  -- Personal/ephemeral topics (e.g. my-orders-*) — allow; underlying table RLS filters payloads
  IF position('my-orders-' in _topic) = 1 THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

DROP POLICY IF EXISTS "authenticated_can_read_realtime_messages" ON realtime.messages;
DROP POLICY IF EXISTS "authenticated_can_write_realtime_messages" ON realtime.messages;

CREATE POLICY "authorized_topic_read_realtime_messages"
ON realtime.messages
FOR SELECT
TO authenticated
USING (public.realtime_topic_authorized((realtime.topic())::text));

CREATE POLICY "authorized_topic_write_realtime_messages"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (public.realtime_topic_authorized((realtime.topic())::text));
