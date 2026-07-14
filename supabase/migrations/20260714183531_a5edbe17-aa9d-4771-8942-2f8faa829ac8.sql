-- Fix privilege escalation: customers self-update RLS
DROP POLICY IF EXISTS "Users update own customer profile" ON public.customers;

CREATE OR REPLACE FUNCTION public.customer_admin_fields_unchanged(_old public.customers, _new public.customers)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    _new.verified IS NOT DISTINCT FROM _old.verified
    AND _new.is_blocked IS NOT DISTINCT FROM _old.is_blocked
    AND _new.admin_notes IS NOT DISTINCT FROM _old.admin_notes
    AND _new.tags IS NOT DISTINCT FROM _old.tags
    AND _new.assigned_to IS NOT DISTINCT FROM _old.assigned_to
    AND _new.referral_active IS NOT DISTINCT FROM _old.referral_active
    AND _new.user_id IS NOT DISTINCT FROM _old.user_id;
$$;

CREATE POLICY "Users update own customer profile"
ON public.customers
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.customer_admin_fields_unchanged(customers.*, customers.*)
  )
);

-- Note: Postgres RLS WITH CHECK sees only NEW; comparing to OLD requires a trigger.
-- Replace above with a trigger-based guard:
DROP POLICY IF EXISTS "Users update own customer profile" ON public.customers;
CREATE POLICY "Users update own customer profile"
ON public.customers
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.guard_customer_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.verified IS DISTINCT FROM OLD.verified
     OR NEW.is_blocked IS DISTINCT FROM OLD.is_blocked
     OR NEW.admin_notes IS DISTINCT FROM OLD.admin_notes
     OR NEW.tags IS DISTINCT FROM OLD.tags
     OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
     OR NEW.referral_active IS DISTINCT FROM OLD.referral_active
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
  THEN
    RAISE EXCEPTION 'Admin-managed customer fields cannot be changed by non-admin users';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_customer_admin_fields_trg ON public.customers;
CREATE TRIGGER guard_customer_admin_fields_trg
BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.guard_customer_admin_fields();

-- Fix privilege escalation: leads self-update RLS
CREATE OR REPLACE FUNCTION public.guard_lead_self_update_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  -- Pricing + accepted-vendor-list + slot fields are admin/system-managed
  IF NEW.lead_price_inr IS DISTINCT FROM OLD.lead_price_inr
     OR NEW.accepted_count IS DISTINCT FROM OLD.accepted_count
     OR NEW.max_slots IS DISTINCT FROM OLD.max_slots
     OR NEW.accepted_vendor_ids IS DISTINCT FROM OLD.accepted_vendor_ids
     OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
     OR NEW.accepted_vendor_id IS DISTINCT FROM OLD.accepted_vendor_id
  THEN
    RAISE EXCEPTION 'Restricted lead fields cannot be changed by non-admin users';
  END IF;
  -- Customer (owner) can update notes/details but not status transitions
  IF auth.uid() = OLD.customer_id AND auth.uid() IS DISTINCT FROM OLD.accepted_vendor_id THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Customers cannot change lead status directly';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_lead_self_update_trg ON public.leads;
CREATE TRIGGER guard_lead_self_update_trg
BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.guard_lead_self_update_fields();

-- Vendor location columns for map pin + directions
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS lat numeric;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS lng numeric;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS google_maps_url text;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS suggested_categories jsonb;