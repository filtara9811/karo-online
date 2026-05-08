CREATE OR REPLACE FUNCTION public.is_lead_owner(_lead_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.leads
    WHERE id = _lead_id
      AND customer_id = _user_id
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_lead_owner(uuid, uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "Vendors view own notifications" ON public.lead_notifications;
CREATE POLICY "Vendors and lead owners view notifications"
ON public.lead_notifications
FOR SELECT
TO authenticated
USING (
  auth.uid() = vendor_id
  OR public.is_admin_user(auth.uid())
  OR public.is_lead_owner(lead_id, auth.uid())
);

DROP POLICY IF EXISTS "Insert notifications by lead owner" ON public.lead_notifications;
CREATE POLICY "Lead owners insert notifications"
ON public.lead_notifications
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_lead_owner(lead_id, auth.uid())
  OR public.is_admin_user(auth.uid())
);

DROP POLICY IF EXISTS "Leads visible to involved parties" ON public.leads;
CREATE POLICY "Leads visible to involved parties"
ON public.leads
FOR SELECT
TO authenticated
USING (
  auth.uid() = customer_id
  OR auth.uid() = accepted_vendor_id
  OR public.is_admin_user(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.lead_notifications n
    WHERE n.lead_id = leads.id
      AND n.vendor_id = auth.uid()
  )
);