CREATE OR REPLACE FUNCTION public.customers_freeze_admin_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.is_service_role_request() OR (auth.uid() IS NOT NULL AND public.is_admin_user(auth.uid())) THEN
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
$function$;

CREATE OR REPLACE FUNCTION public.merchant_link_settings_freeze_premium()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.is_service_role_request() OR (auth.uid() IS NOT NULL AND public.is_admin_user(auth.uid())) THEN
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
$function$;

CREATE OR REPLACE FUNCTION public.qr_projects_freeze_payment_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.is_service_role_request() OR (auth.uid() IS NOT NULL AND public.is_admin_user(auth.uid())) THEN
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
$function$;