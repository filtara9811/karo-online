
-- 1. Extend notification_campaigns
ALTER TABLE public.notification_campaigns
  ADD COLUMN IF NOT EXISTS audience_filter jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS manual_targets jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS template_id uuid;

-- 2. Templates table
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  image_url text,
  action_url text,
  notification_type text NOT NULL DEFAULT 'basic',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_templates TO authenticated;
GRANT ALL ON public.notification_templates TO service_role;

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage notification_templates" ON public.notification_templates;
CREATE POLICY "Admins manage notification_templates" ON public.notification_templates
  TO authenticated USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));

DROP TRIGGER IF EXISTS trg_notification_templates_updated ON public.notification_templates;
CREATE TRIGGER trg_notification_templates_updated BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.notification_campaigns
  ADD CONSTRAINT notification_campaigns_template_fk
  FOREIGN KEY (template_id) REFERENCES public.notification_templates(id) ON DELETE SET NULL
  NOT VALID;

-- 3. Audience segmentation RPC
-- Filter shape: { role: 'vendor'|'customer'|'all', kyc_status: 'verified'|'pending'|'rejected'|'any', active: 'active'|'blocked'|'any', city: text|null }
CREATE OR REPLACE FUNCTION public.admin_segment_audience(_filter jsonb)
RETURNS TABLE (user_id uuid, display_name text, phone text, role text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _role text := COALESCE(_filter->>'role', 'all');
  _kyc text := COALESCE(_filter->>'kyc_status', 'any');
  _active text := COALESCE(_filter->>'active', 'any');
  _city text := NULLIF(_filter->>'city', '');
BEGIN
  IF NOT is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT v.user_id, COALESCE(v.owner_name, v.business_name, 'Vendor'), v.whatsapp::text, 'vendor'::text
  FROM public.vendors v
  WHERE _role IN ('all','vendor')
    AND v.user_id IS NOT NULL
    AND (_active = 'any'
         OR (_active = 'active' AND COALESCE(v.is_blocked, false) = false)
         OR (_active = 'blocked' AND COALESCE(v.is_blocked, false) = true))
    AND (_kyc = 'any' OR EXISTS (
      SELECT 1 FROM public.kyc_verifications k
      WHERE k.subject_user_id = v.user_id AND k.status = _kyc
    ))
    AND (_city IS NULL OR EXISTS (
      SELECT 1 FROM public.customers c2 WHERE c2.user_id = v.user_id AND c2.address ILIKE '%'||_city||'%'
    ))

  UNION ALL

  SELECT c.user_id, COALESCE(c.name, 'Customer'), c.phone, 'customer'::text
  FROM public.customers c
  WHERE _role IN ('all','customer')
    AND c.user_id IS NOT NULL
    AND (_active = 'any'
         OR (_active = 'active' AND COALESCE(c.is_blocked, false) = false)
         OR (_active = 'blocked' AND COALESCE(c.is_blocked, false) = true))
    AND (_city IS NULL OR c.address ILIKE '%'||_city||'%');
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_segment_audience(jsonb) TO authenticated;

-- 4. Resolve campaign audience = filter audience + manual_targets (uuids OR phones)
CREATE OR REPLACE FUNCTION public.admin_resolve_campaign_users(_campaign_id uuid)
RETURNS TABLE (user_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _c record;
  _t jsonb;
BEGIN
  IF NOT is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT audience_filter, manual_targets INTO _c
  FROM public.notification_campaigns WHERE id = _campaign_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'campaign_not_found';
  END IF;

  RETURN QUERY
  SELECT DISTINCT a.user_id FROM public.admin_segment_audience(_c.audience_filter) a
  UNION
  SELECT DISTINCT v.user_id FROM public.vendors v
   WHERE v.whatsapp::text = ANY (
     SELECT jsonb_array_elements_text(_c.manual_targets)
   )
  UNION
  SELECT DISTINCT c.user_id FROM public.customers c
   WHERE c.phone = ANY (
     SELECT jsonb_array_elements_text(_c.manual_targets)
   )
  UNION
  SELECT (jsonb_array_elements_text(_c.manual_targets))::uuid
   WHERE EXISTS (SELECT 1 FROM jsonb_array_elements_text(_c.manual_targets) x
                 WHERE x ~ '^[0-9a-fA-F-]{36}$');
EXCEPTION WHEN others THEN
  -- fallback if uuid cast fails
  RETURN QUERY
  SELECT DISTINCT a.user_id FROM public.admin_segment_audience(_c.audience_filter) a;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_resolve_campaign_users(uuid) TO authenticated;

-- 5. Log details RPC for clickable KPI drawers
CREATE OR REPLACE FUNCTION public.admin_get_log_details(_status text DEFAULT NULL, _campaign_id uuid DEFAULT NULL, _limit int DEFAULT 200)
RETURNS TABLE (
  id uuid, user_id uuid, display_name text, phone text,
  status text, channel text, provider text, error text, created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT l.id, l.user_id,
    COALESCE(v.owner_name, v.business_name, c.name, 'Unknown'),
    COALESCE(v.whatsapp::text, c.phone),
    l.status, l.channel, l.provider, l.error, l.created_at
  FROM public.notification_logs l
  LEFT JOIN public.vendors v ON v.user_id = l.user_id
  LEFT JOIN public.customers c ON c.user_id = l.user_id
  WHERE (_status IS NULL OR l.status = _status)
    AND (_campaign_id IS NULL OR l.campaign_id = _campaign_id)
  ORDER BY l.created_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 1000));
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_log_details(text, uuid, int) TO authenticated;
