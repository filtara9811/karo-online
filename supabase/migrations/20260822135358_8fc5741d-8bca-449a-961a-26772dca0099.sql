-- 1. Guard: honour a request-scoped trusted-write flag set only by save_customer_profile
CREATE OR REPLACE FUNCTION public.guard_customer_admin_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF coalesce(current_setting('app.trusted_customer_write', true), '') = 'on' THEN
    RETURN NEW;
  END IF;
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
$function$;

-- 2. Freeze trigger: same flag, so verified/user_id set by the signup routine is not reverted
CREATE OR REPLACE FUNCTION public.customers_freeze_admin_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF coalesce(current_setting('app.trusted_customer_write', true), '') = 'on'
     OR public.is_service_role_request()
     OR (auth.uid() IS NOT NULL AND public.is_admin_user(auth.uid())) THEN
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

-- 3. Privileged self-update trigger: same flag (it also pins verified/status)
CREATE OR REPLACE FUNCTION public.prevent_customer_privileged_self_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF coalesce(current_setting('app.trusted_customer_write', true), '') = 'on' THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() = OLD.user_id AND NOT public.is_admin_user(auth.uid()) THEN
    NEW.is_blocked := OLD.is_blocked;
    NEW.verified := OLD.verified;
    NEW.status := OLD.status;
  END IF;
  RETURN NEW;
END;
$function$;

-- 4. Signup routine: set the flag for its own transaction only; address/dob now optional
CREATE OR REPLACE FUNCTION public.save_customer_profile(_name text, _gender text, _phone text, _email text, _address text)
 RETURNS customers
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _phone10 text := public.normalize_phone10(_phone);
  _email_norm text := public.normalize_email(_email);
  _row public.customers;
  _target_id uuid;
  _conflict_owner text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Login required';
  END IF;

  -- Trusted write: this routine is the only sanctioned path that may mark the
  -- caller's own row verified and link it to their auth user. Local scope only.
  PERFORM set_config('app.trusted_customer_write', 'on', true);

  SELECT c.id INTO _target_id
  FROM public.customers c
  WHERE c.user_id = _uid
     OR (_phone10 IS NOT NULL AND public.normalize_phone10(c.phone) = _phone10)
  ORDER BY (c.user_id = _uid) DESC, c.created_at ASC, c.id ASC
  LIMIT 1;

  IF _email_norm IS NOT NULL THEN
    SELECT c.name INTO _conflict_owner
    FROM public.customers c
    WHERE public.normalize_email(c.email) = _email_norm
      AND c.user_id IS DISTINCT FROM _uid
      AND (_target_id IS NULL OR c.id <> _target_id)
    LIMIT 1;
    IF _conflict_owner IS NOT NULL THEN
      RAISE EXCEPTION 'Yeh email pehle se registered hai (% ke account par). Doosri email use karein.', _conflict_owner
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  IF _target_id IS NOT NULL THEN
    IF _phone10 IS NOT NULL THEN
      DELETE FROM public.customers c
      WHERE c.id <> _target_id
        AND public.normalize_phone10(c.phone) = _phone10;
    END IF;
    DELETE FROM public.customers c
    WHERE c.id <> _target_id
      AND c.user_id = _uid;

    UPDATE public.customers
    SET user_id = _uid,
        name = COALESCE(NULLIF(trim(_name), ''), name),
        gender = COALESCE(NULLIF(trim(_gender), ''), gender),
        phone = COALESCE(NULLIF(trim(_phone), ''), phone),
        email = COALESCE(_email_norm, email),
        address = COALESCE(NULLIF(trim(_address), ''), address),
        verified = true,
        status = 'active',
        updated_at = now()
    WHERE id = _target_id
    RETURNING * INTO _row;
  ELSE
    INSERT INTO public.customers (user_id, name, gender, phone, email, address, verified, status)
    VALUES (_uid, NULLIF(trim(_name), ''), NULLIF(trim(_gender), ''), NULLIF(trim(_phone), ''), _email_norm, NULLIF(trim(_address), ''), true, 'active')
    RETURNING * INTO _row;
  END IF;

  RETURN _row;
EXCEPTION
  WHEN unique_violation THEN
    IF SQLERRM ILIKE '%email%' THEN
      RAISE EXCEPTION 'Yeh email pehle se registered hai. Doosri email use karein.' USING ERRCODE = 'unique_violation';
    END IF;
    IF _phone10 IS NULL THEN RAISE; END IF;
    PERFORM set_config('app.trusted_customer_write', 'on', true);
    SELECT c.id INTO _target_id
    FROM public.customers c
    WHERE public.normalize_phone10(c.phone) = _phone10
    ORDER BY (c.user_id = _uid) DESC, c.created_at ASC, c.id ASC
    LIMIT 1;
    IF _target_id IS NULL THEN RAISE; END IF;
    DELETE FROM public.customers c
    WHERE c.id <> _target_id
      AND (c.user_id = _uid OR public.normalize_phone10(c.phone) = _phone10);
    UPDATE public.customers
    SET user_id = _uid,
        name = COALESCE(NULLIF(trim(_name), ''), name),
        gender = COALESCE(NULLIF(trim(_gender), ''), gender),
        phone = COALESCE(NULLIF(trim(_phone), ''), phone),
        email = COALESCE(_email_norm, email),
        address = COALESCE(NULLIF(trim(_address), ''), address),
        verified = true,
        status = 'active',
        updated_at = now()
    WHERE id = _target_id
    RETURNING * INTO _row;
    RETURN _row;
END;
$function$;

-- 5. Universal login lookup: also return rows without a name (returning user detection)
CREATE OR REPLACE FUNCTION public.lookup_customer_by_phone(_phone text)
 RETURNS TABLE(exists_flag boolean, name text, gender text, email text, address text, user_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    TRUE AS exists_flag,
    c.name,
    c.gender,
    c.email,
    c.address,
    CASE WHEN auth.uid() = c.user_id OR public.is_admin_user(auth.uid()) THEN c.user_id ELSE NULL END AS user_id
  FROM public.customers c
  WHERE public.normalize_phone10(c.phone) = public.normalize_phone10(_phone)
    AND coalesce(c.status, 'active') <> 'deleted'
    AND c.is_blocked = false
  ORDER BY (c.name IS NOT NULL) DESC, c.created_at ASC
  LIMIT 1
$function$;