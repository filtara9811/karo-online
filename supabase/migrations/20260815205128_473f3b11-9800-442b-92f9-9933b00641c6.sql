-- 1) Mirror USING into WITH CHECK so rows can't be moved out of the caller's scope
DROP POLICY IF EXISTS "Customers update own leads" ON public.leads;
CREATE POLICY "Customers update own leads" ON public.leads
FOR UPDATE TO authenticated
USING ((auth.uid() = customer_id) OR (auth.uid() = accepted_vendor_id) OR is_admin_user(auth.uid()))
WITH CHECK ((auth.uid() = customer_id) OR (auth.uid() = accepted_vendor_id) OR is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Vendors update own notifications" ON public.lead_notifications;
CREATE POLICY "Vendors update own notifications" ON public.lead_notifications
FOR UPDATE TO authenticated
USING ((auth.uid() = vendor_id) OR is_admin_user(auth.uid()))
WITH CHECK ((auth.uid() = vendor_id) OR is_admin_user(auth.uid()));

-- 2) Freeze assignment/pricing columns for direct client updates.
--    SECURITY DEFINER RPCs run as the function owner, so they are unaffected.
CREATE OR REPLACE FUNCTION public.leads_freeze_assignment_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user = 'authenticated' AND NOT is_admin_user(auth.uid()) THEN
    NEW.customer_id := OLD.customer_id;
    NEW.accepted_vendor_id := OLD.accepted_vendor_id;
    NEW.accepted_vendor_ids := OLD.accepted_vendor_ids;
    NEW.lead_price_inr := OLD.lead_price_inr;
    -- customers may only clear their approval; setting one goes through the RPC
    IF NEW.customer_approved_vendor_id IS NOT NULL THEN
      NEW.customer_approved_vendor_id := OLD.customer_approved_vendor_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_freeze_assignment_fields ON public.leads;
CREATE TRIGGER leads_freeze_assignment_fields
BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.leads_freeze_assignment_fields();

CREATE OR REPLACE FUNCTION public.lead_notifications_freeze_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user = 'authenticated' AND NOT is_admin_user(auth.uid()) THEN
    NEW.vendor_id := OLD.vendor_id;
    NEW.lead_id := OLD.lead_id;
    NEW.auto_accept_at := OLD.auto_accept_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lead_notifications_freeze_fields ON public.lead_notifications;
CREATE TRIGGER lead_notifications_freeze_fields
BEFORE UPDATE ON public.lead_notifications
FOR EACH ROW EXECUTE FUNCTION public.lead_notifications_freeze_fields();