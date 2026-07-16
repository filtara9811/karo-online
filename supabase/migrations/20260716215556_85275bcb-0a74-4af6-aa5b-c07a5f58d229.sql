
-- 1) Restrict customer_form_toggles admin policy to authenticated role
DROP POLICY IF EXISTS "admins manage customer toggles" ON public.customer_form_toggles;
CREATE POLICY "admins manage customer toggles"
  ON public.customer_form_toggles
  FOR ALL
  TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

-- 2) Gate public web_media_assets reads by is_active flag
ALTER TABLE public.web_media_assets
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

DROP POLICY IF EXISTS "anyone read media" ON public.web_media_assets;
CREATE POLICY "anyone read active media"
  ON public.web_media_assets
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "admin all media" ON public.web_media_assets;
CREATE POLICY "admin all media"
  ON public.web_media_assets
  FOR ALL
  TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

-- 3) Harden Vendors update own row — enforce per-row identity + immutable admin/PII fields via trigger
DROP POLICY IF EXISTS "Vendors update own row" ON public.vendors;
CREATE POLICY "Vendors update own row"
  ON public.vendors
  FOR UPDATE
  TO authenticated
  USING ((auth.uid() = user_id) OR public.is_admin_user(auth.uid()))
  WITH CHECK ((auth.uid() = user_id) OR public.is_admin_user(auth.uid()));

CREATE OR REPLACE FUNCTION public.vendors_prevent_privileged_field_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins can change anything
  IF public.is_admin_user(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- Non-admins cannot mutate immutable/verified/admin-controlled fields
  IF NEW.verified   IS DISTINCT FROM OLD.verified
     OR NEW.is_premium IS DISTINCT FROM OLD.is_premium
     OR NEW.status  IS DISTINCT FROM OLD.status
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR (OLD.pan     IS NOT NULL AND NEW.pan     IS DISTINCT FROM OLD.pan)
     OR (OLD.aadhaar IS NOT NULL AND NEW.aadhaar IS DISTINCT FROM OLD.aadhaar)
     OR (OLD.gst     IS NOT NULL AND NEW.gst     IS DISTINCT FROM OLD.gst)
  THEN
    RAISE EXCEPTION 'Cannot modify protected vendor fields';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vendors_prevent_privileged_field_change ON public.vendors;
CREATE TRIGGER vendors_prevent_privileged_field_change
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.vendors_prevent_privileged_field_change();

-- 4) Set fixed search_path on customer_admin_fields_unchanged
CREATE OR REPLACE FUNCTION public.customer_admin_fields_unchanged(_old public.customers, _new public.customers)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
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
