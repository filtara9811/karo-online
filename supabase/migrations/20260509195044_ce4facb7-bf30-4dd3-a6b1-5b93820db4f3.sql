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

  IF _target_id IS NOT NULL THEN
    -- Remove other rows that would conflict on this phone before updating the kept row.
    IF _phone10 IS NOT NULL THEN
      DELETE FROM public.customers c
      WHERE c.id <> _target_id
        AND public.normalize_phone10(c.phone) = _phone10;
    END IF;

    -- If another row already belongs to this user, keep the target and remove the duplicate user row.
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
    -- Last-resort recovery for races caused by the unique phone index.
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
        updated_at = now()
    WHERE id = _target_id
    RETURNING * INTO _row;

    RETURN _row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_customer_profile(text, text, text, text, text) TO authenticated;