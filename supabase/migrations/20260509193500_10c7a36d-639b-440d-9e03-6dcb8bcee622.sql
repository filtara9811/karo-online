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
  _existing_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Login required';
  END IF;

  -- If a customer row with same phone already exists, claim it for this user (covers anonymous/guest signups).
  IF _phone10 IS NOT NULL THEN
    SELECT c.id INTO _existing_id
    FROM public.customers c
    WHERE public.normalize_phone10(c.phone) = _phone10
    ORDER BY (c.user_id = _uid) DESC NULLS LAST, c.created_at ASC
    LIMIT 1;

    IF _existing_id IS NOT NULL THEN
      -- Make sure the row belongs to the current user before upserting.
      UPDATE public.customers
      SET user_id = _uid
      WHERE id = _existing_id
        AND (user_id IS DISTINCT FROM _uid);

      -- If our user already had a different row, merge by deleting the duplicate (keep claimed one).
      DELETE FROM public.customers
      WHERE user_id = _uid
        AND id <> _existing_id;
    END IF;
  END IF;

  IF _email_norm IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.customers c
    WHERE public.normalize_email(c.email) = _email_norm
      AND c.user_id <> _uid
  ) THEN
    RAISE EXCEPTION 'Email already registered';
  END IF;

  INSERT INTO public.customers (user_id, name, gender, phone, email, address, verified, status)
  VALUES (_uid, NULLIF(trim(_name), ''), NULLIF(trim(_gender), ''), NULLIF(trim(_phone), ''), _email_norm, NULLIF(trim(_address), ''), true, 'active')
  ON CONFLICT (user_id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, public.customers.name),
    gender = COALESCE(EXCLUDED.gender, public.customers.gender),
    phone = COALESCE(EXCLUDED.phone, public.customers.phone),
    email = COALESCE(EXCLUDED.email, public.customers.email),
    address = COALESCE(EXCLUDED.address, public.customers.address),
    verified = true,
    updated_at = now()
  RETURNING * INTO _row;

  RETURN _row;
END;
$function$;