-- Helper: is the current request coming from the trusted backend (service role)?
CREATE OR REPLACE FUNCTION public.is_service_role_request()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT coalesce(
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role',
    false
  ) OR current_user IN ('postgres', 'supabase_admin', 'service_role');
$$;

-- 1) customers: freeze admin moderation columns from client writes
CREATE OR REPLACE FUNCTION public.customers_freeze_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_service_role_request() OR public.is_admin_user() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.verified := false;
    NEW.is_blocked := false;
    NEW.admin_notes := NULL;
    NEW.assigned_to := NULL;
    RETURN NEW;
  END IF;

  NEW.verified := OLD.verified;
  NEW.is_blocked := OLD.is_blocked;
  NEW.admin_notes := OLD.admin_notes;
  NEW.assigned_to := OLD.assigned_to;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_customers_freeze_admin_fields ON public.customers;
CREATE TRIGGER trg_customers_freeze_admin_fields
BEFORE INSERT OR UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.customers_freeze_admin_fields();

-- 2) merchant_link_settings: freeze premium payment outcome columns
CREATE OR REPLACE FUNCTION public.merchant_link_settings_freeze_premium()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_service_role_request() OR public.is_admin_user() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.premium_unlocked := false;
    NEW.premium_paid_at := NULL;
    NEW.premium_payment_ref := NULL;
    RETURN NEW;
  END IF;

  NEW.premium_unlocked := OLD.premium_unlocked;
  NEW.premium_paid_at := OLD.premium_paid_at;
  NEW.premium_payment_ref := OLD.premium_payment_ref;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mls_freeze_premium ON public.merchant_link_settings;
CREATE TRIGGER trg_mls_freeze_premium
BEFORE INSERT OR UPDATE ON public.merchant_link_settings
FOR EACH ROW EXECUTE FUNCTION public.merchant_link_settings_freeze_premium();

-- 3) qr_projects: freeze payment outcome columns
CREATE OR REPLACE FUNCTION public.qr_projects_freeze_payment_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_service_role_request() OR public.is_admin_user() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.is_paid := false;
    NEW.price_inr := 0;
    RETURN NEW;
  END IF;

  NEW.is_paid := OLD.is_paid;
  NEW.price_inr := OLD.price_inr;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_qr_projects_freeze_payment ON public.qr_projects;
CREATE TRIGGER trg_qr_projects_freeze_payment
BEFORE INSERT OR UPDATE ON public.qr_projects
FOR EACH ROW EXECUTE FUNCTION public.qr_projects_freeze_payment_fields();