-- ============================================================
-- 1. LEADS: restrict PII to customer / accepted vendors / admins
-- ============================================================
DROP POLICY IF EXISTS "Leads visible to involved parties" ON public.leads;
DROP POLICY IF EXISTS "leads_select_involved_parties" ON public.leads;

CREATE POLICY "leads_select_authorized"
ON public.leads
FOR SELECT
TO authenticated
USING (
  customer_id = auth.uid()
  OR auth.uid() = accepted_vendor_id
  OR auth.uid() = ANY (COALESCE(accepted_vendor_ids, ARRAY[]::uuid[]))
  OR is_admin_user(auth.uid())
);

-- Safe summary for a single lead the caller was notified about
CREATE OR REPLACE FUNCTION public.get_pending_lead_brief(p_lead_id uuid)
RETURNS TABLE (
  id uuid,
  sub_category_id uuid,
  sub_category_name text,
  note text,
  lead_price_inr numeric,
  status text,
  created_at timestamptz,
  images text[],
  item_names text[],
  area_hint text,
  customer_name_initial text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT (
    is_admin_user(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.lead_notifications n
      WHERE n.lead_id = p_lead_id AND n.vendor_id = auth.uid()
    )
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    l.id,
    l.sub_category_id,
    l.sub_category_name,
    l.note,
    l.lead_price_inr,
    l.status,
    l.created_at,
    l.images,
    l.item_names,
    CASE
      WHEN l.address IS NULL OR l.address = '' THEN NULL
      ELSE NULLIF(btrim(split_part(l.address, ',', GREATEST(array_length(string_to_array(l.address, ','), 1) - 1, 1))), '')
    END AS area_hint,
    CASE
      WHEN l.customer_name IS NULL OR l.customer_name = '' THEN NULL
      ELSE left(l.customer_name, 1) || '.'
    END AS customer_name_initial
  FROM public.leads l
  WHERE l.id = p_lead_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_pending_lead_brief(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pending_lead_brief(uuid) TO authenticated;

-- List version: all pending lead briefs for the calling vendor
CREATE OR REPLACE FUNCTION public.get_my_pending_lead_briefs()
RETURNS TABLE (
  id uuid,
  sub_category_id uuid,
  sub_category_name text,
  note text,
  lead_price_inr numeric,
  status text,
  created_at timestamptz,
  images text[],
  item_names text[],
  area_hint text,
  customer_name_initial text,
  notification_status text,
  quoted_price numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.sub_category_id,
    l.sub_category_name,
    l.note,
    l.lead_price_inr,
    l.status,
    l.created_at,
    l.images,
    l.item_names,
    CASE
      WHEN l.address IS NULL OR l.address = '' THEN NULL
      ELSE NULLIF(btrim(split_part(l.address, ',', GREATEST(array_length(string_to_array(l.address, ','), 1) - 1, 1))), '')
    END AS area_hint,
    CASE
      WHEN l.customer_name IS NULL OR l.customer_name = '' THEN NULL
      ELSE left(l.customer_name, 1) || '.'
    END AS customer_name_initial,
    n.status AS notification_status,
    n.quoted_price
  FROM public.lead_notifications n
  JOIN public.leads l ON l.id = n.lead_id
  WHERE n.vendor_id = auth.uid()
  ORDER BY n.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_pending_lead_briefs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_pending_lead_briefs() TO authenticated;

-- ============================================================
-- 2. LEAD_NOTIFICATIONS: customer only sees engaged/accepted vendors
-- ============================================================
DROP POLICY IF EXISTS "Vendors and lead owners view notifications" ON public.lead_notifications;

CREATE POLICY "Vendors and lead owners view notifications"
ON public.lead_notifications
FOR SELECT
TO authenticated
USING (
  auth.uid() = vendor_id
  OR is_admin_user(auth.uid())
  OR (
    is_lead_owner(lead_id, auth.uid())
    AND (
      status IN ('accepted', 'completed', 'rejected_by_customer')
      OR EXISTS (
        SELECT 1 FROM public.leads l
        WHERE l.id = lead_notifications.lead_id
          AND (
            l.accepted_vendor_id = lead_notifications.vendor_id
            OR lead_notifications.vendor_id = ANY (COALESCE(l.accepted_vendor_ids, ARRAY[]::uuid[]))
            OR l.customer_approved_vendor_id = lead_notifications.vendor_id
          )
      )
    )
  )
);

-- ============================================================
-- 3. REFERRALS: add referrer SELECT, hide PII columns from users
-- ============================================================
DROP POLICY IF EXISTS "ref_select_own_or_admin" ON public.referrals;

CREATE POLICY "ref_select_own_or_admin"
ON public.referrals
FOR SELECT
TO authenticated
USING (
  auth.uid() = referred_user_id
  OR auth.uid() = referrer_user_id
  OR is_admin_user(auth.uid())
);

-- Revoke PII columns from end-user roles. Admin/server reads go through
-- supabaseAdmin (service_role) which bypasses column grants.
REVOKE SELECT (referred_phone, ip_address, device_fingerprint)
  ON public.referrals FROM authenticated;
REVOKE SELECT (referred_phone, ip_address, device_fingerprint)
  ON public.referrals FROM anon;

-- ============================================================
-- 4. VENDOR_ITEM_MAPPINGS: require auth (no anon access)
-- ============================================================
DROP POLICY IF EXISTS "Public can view active mappings" ON public.vendor_item_mappings;

CREATE POLICY "Authenticated can view active mappings"
ON public.vendor_item_mappings
FOR SELECT
TO authenticated
USING (
  is_active = true
  AND EXISTS (
    SELECT 1 FROM public.vendors v
    WHERE v.user_id = vendor_item_mappings.vendor_id
      AND COALESCE(v.is_blocked, false) = false
      AND v.status = ANY (ARRAY['active'::text, 'approved'::text])
  )
);
