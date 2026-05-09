CREATE OR REPLACE FUNCTION public.save_customer_profile_as_user(
  _uid uuid,
  _name text,
  _gender text,
  _phone text,
  _email text,
  _address text
)
RETURNS public.customers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _phone10 text := public.normalize_phone10(_phone);
  _email_norm text := public.normalize_email(_email);
  _row public.customers;
  _target_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'User required';
  END IF;

  SELECT c.id INTO _target_id
  FROM public.customers c
  WHERE c.user_id = _uid
     OR (_phone10 IS NOT NULL AND public.normalize_phone10(c.phone) = _phone10)
  ORDER BY (c.user_id = _uid) DESC, c.created_at ASC, c.id ASC
  LIMIT 1;

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
        signup_method = COALESCE(signup_method, 'phone_otp'),
        updated_at = now()
    WHERE id = _target_id
    RETURNING * INTO _row;
  ELSE
    INSERT INTO public.customers (user_id, name, gender, phone, email, address, verified, status, signup_method)
    VALUES (_uid, NULLIF(trim(_name), ''), NULLIF(trim(_gender), ''), NULLIF(trim(_phone), ''), _email_norm, NULLIF(trim(_address), ''), true, 'active', 'phone_otp')
    RETURNING * INTO _row;
  END IF;

  RETURN _row;
EXCEPTION
  WHEN unique_violation THEN
    IF _phone10 IS NULL THEN
      RAISE;
    END IF;

    SELECT c.id INTO _target_id
    FROM public.customers c
    WHERE public.normalize_phone10(c.phone) = _phone10
    ORDER BY (c.user_id = _uid) DESC, c.created_at ASC, c.id ASC
    LIMIT 1;

    IF _target_id IS NULL THEN
      RAISE;
    END IF;

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
        signup_method = COALESCE(signup_method, 'phone_otp'),
        updated_at = now()
    WHERE id = _target_id
    RETURNING * INTO _row;

    RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.save_customer_profile_as_user(uuid, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_customer_profile_as_user(uuid, text, text, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.save_customer_profile_as_user(uuid, text, text, text, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.save_customer_profile_as_user(uuid, text, text, text, text, text) TO service_role;