
-- 1) Public RPC: check whether an email is already used by ANOTHER customer.
-- Returns owner_name when taken so the UI can surface a friendly message.
CREATE OR REPLACE FUNCTION public.check_customer_email_available(
  _email text,
  _phone text DEFAULT NULL
)
RETURNS TABLE(available boolean, owner_name text, owner_phone_last4 text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _norm text := public.normalize_email(_email);
  _phone10 text := public.normalize_phone10(_phone);
  _row RECORD;
BEGIN
  IF _norm IS NULL OR length(_norm) = 0 THEN
    available := true; owner_name := NULL; owner_phone_last4 := NULL;
    RETURN NEXT; RETURN;
  END IF;

  SELECT c.name, c.phone
    INTO _row
  FROM public.customers c
  WHERE public.normalize_email(c.email) = _norm
    AND (_phone10 IS NULL OR public.normalize_phone10(c.phone) IS DISTINCT FROM _phone10)
    AND (auth.uid() IS NULL OR c.user_id IS DISTINCT FROM auth.uid())
  ORDER BY c.created_at ASC
  LIMIT 1;

  IF NOT FOUND THEN
    available := true; owner_name := NULL; owner_phone_last4 := NULL;
  ELSE
    available := false;
    owner_name := COALESCE(_row.name, 'an existing user');
    owner_phone_last4 := CASE WHEN _row.phone IS NULL THEN NULL ELSE right(regexp_replace(_row.phone, '\D', '', 'g'), 4) END;
  END IF;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.check_customer_email_available(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_customer_email_available(text, text) TO anon, authenticated, service_role;

-- 2) Public RPC: look up referrer display name from a referral code.
CREATE OR REPLACE FUNCTION public.lookup_referrer_by_code(_code text)
RETURNS TABLE(valid boolean, referrer_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _norm text := upper(trim(coalesce(_code, '')));
  _uid uuid;
  _name text;
BEGIN
  IF length(_norm) < 3 THEN
    valid := false; referrer_name := NULL;
    RETURN NEXT; RETURN;
  END IF;

  SELECT rc.user_id INTO _uid FROM public.referral_codes rc WHERE upper(rc.code) = _norm LIMIT 1;
  IF _uid IS NULL THEN
    valid := false; referrer_name := NULL;
    RETURN NEXT; RETURN;
  END IF;

  -- Try customers first, then vendors
  SELECT c.name INTO _name FROM public.customers c WHERE c.user_id = _uid LIMIT 1;
  IF _name IS NULL THEN
    SELECT v.business_name INTO _name FROM public.vendors v WHERE v.user_id = _uid LIMIT 1;
  END IF;

  valid := true;
  referrer_name := COALESCE(_name, 'Karo Online member');
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_referrer_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_referrer_by_code(text) TO anon, authenticated, service_role;

-- 3) Harden save_customer_profile to give a clear error when the email belongs
--    to a different user, and to recover from email unique_violation races by
--    keeping the row we already own.
CREATE OR REPLACE FUNCTION public.save_customer_profile(_name text, _gender text, _phone text, _email text, _address text)
RETURNS public.customers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Prefer the current user's profile row; otherwise claim the oldest row with this phone.
  SELECT c.id INTO _target_id
  FROM public.customers c
  WHERE c.user_id = _uid
     OR (_phone10 IS NOT NULL AND public.normalize_phone10(c.phone) = _phone10)
  ORDER BY (c.user_id = _uid) DESC, c.created_at ASC, c.id ASC
  LIMIT 1;

  -- Friendly pre-check: email already owned by a different user/row
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
$$;

GRANT EXECUTE ON FUNCTION public.save_customer_profile(text, text, text, text, text) TO authenticated;
