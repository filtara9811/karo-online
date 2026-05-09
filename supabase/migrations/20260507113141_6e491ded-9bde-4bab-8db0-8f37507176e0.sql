CREATE OR REPLACE FUNCTION public.normalize_phone10(_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT NULLIF(right(regexp_replace(coalesce(_phone, ''), '\D', '', 'g'), 10), '')
$$;

CREATE OR REPLACE FUNCTION public.normalize_email(_email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT NULLIF(lower(trim(coalesce(_email, ''))), '')
$$;

WITH ranked_phone AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY public.normalize_phone10(phone)
           ORDER BY
             (EXISTS (SELECT 1 FROM public.vendors v WHERE v.user_id = customers.user_id)) DESC,
             (EXISTS (SELECT 1 FROM public.leads l WHERE l.customer_id = customers.user_id)) DESC,
             created_at ASC,
             id ASC
         ) AS rn
  FROM public.customers
  WHERE public.normalize_phone10(phone) IS NOT NULL
), dup_phone AS (
  SELECT id FROM ranked_phone WHERE rn > 1
)
UPDATE public.customers c
SET phone = NULL,
    updated_at = now()
FROM dup_phone d
WHERE c.id = d.id;

WITH ranked_email AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY public.normalize_email(email)
           ORDER BY
             (EXISTS (SELECT 1 FROM public.vendors v WHERE v.user_id = customers.user_id)) DESC,
             (EXISTS (SELECT 1 FROM public.leads l WHERE l.customer_id = customers.user_id)) DESC,
             created_at ASC,
             id ASC
         ) AS rn
  FROM public.customers
  WHERE public.normalize_email(email) IS NOT NULL
), dup_email AS (
  SELECT id FROM ranked_email WHERE rn > 1
)
UPDATE public.customers c
SET email = NULL,
    updated_at = now()
FROM dup_email d
WHERE c.id = d.id;

WITH ranked_vendor_phone AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY public.normalize_phone10(whatsapp)
           ORDER BY verified DESC, (status = 'active') DESC, created_at ASC, id ASC
         ) AS rn
  FROM public.vendors
  WHERE public.normalize_phone10(whatsapp) IS NOT NULL
), dup_vendor_phone AS (
  SELECT id FROM ranked_vendor_phone WHERE rn > 1
)
UPDATE public.vendors v
SET whatsapp = NULL,
    updated_at = now()
FROM dup_vendor_phone d
WHERE v.id = d.id;

WITH ranked_vendor_email AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY public.normalize_email(coalesce(email, manager_email))
           ORDER BY verified DESC, (status = 'active') DESC, created_at ASC, id ASC
         ) AS rn
  FROM public.vendors
  WHERE public.normalize_email(coalesce(email, manager_email)) IS NOT NULL
), dup_vendor_email AS (
  SELECT id FROM ranked_vendor_email WHERE rn > 1
)
UPDATE public.vendors v
SET email = NULL,
    manager_email = NULL,
    updated_at = now()
FROM dup_vendor_email d
WHERE v.id = d.id;

CREATE UNIQUE INDEX IF NOT EXISTS customers_unique_phone10
  ON public.customers (public.normalize_phone10(phone))
  WHERE public.normalize_phone10(phone) IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS customers_unique_email_norm
  ON public.customers (public.normalize_email(email))
  WHERE public.normalize_email(email) IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS vendors_unique_whatsapp10
  ON public.vendors (public.normalize_phone10(whatsapp))
  WHERE public.normalize_phone10(whatsapp) IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS vendors_unique_email_norm
  ON public.vendors (public.normalize_email(coalesce(email, manager_email)))
  WHERE public.normalize_email(coalesce(email, manager_email)) IS NOT NULL;

DROP FUNCTION IF EXISTS public.lookup_customer_by_phone(text);

CREATE FUNCTION public.lookup_customer_by_phone(_phone text)
RETURNS TABLE (
  exists_flag boolean,
  name text,
  gender text,
  email text,
  address text,
  user_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    TRUE AS exists_flag,
    c.name,
    c.gender,
    c.email,
    c.address,
    CASE WHEN auth.uid() = c.user_id OR public.is_admin_user(auth.uid()) THEN c.user_id ELSE NULL END AS user_id
  FROM public.customers c
  WHERE public.normalize_phone10(c.phone) = public.normalize_phone10(_phone)
    AND c.status = 'active'
    AND c.is_blocked = false
  ORDER BY c.created_at ASC
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.lookup_customer_by_phone(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.save_customer_profile(
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
  _uid uuid := auth.uid();
  _phone10 text := public.normalize_phone10(_phone);
  _email_norm text := public.normalize_email(_email);
  _row public.customers;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Login required';
  END IF;

  IF _phone10 IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.customers c
    WHERE public.normalize_phone10(c.phone) = _phone10
      AND c.user_id <> _uid
  ) THEN
    RAISE EXCEPTION 'Mobile number already registered';
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
$$;

GRANT EXECUTE ON FUNCTION public.save_customer_profile(text, text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.save_vendor_profile(
  _role text,
  _owner_name text,
  _entity text,
  _trade text,
  _deals_in text,
  _business_name text,
  _whatsapp text,
  _manager_email text,
  _referral text,
  _instagram text,
  _facebook text,
  _website text,
  _google_place_id text,
  _aadhaar text,
  _pan text,
  _gst text,
  _plan text
)
RETURNS public.vendors
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _customer public.customers;
  _phone text;
  _email text;
  _row public.vendors;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Login required';
  END IF;

  SELECT * INTO _customer FROM public.customers WHERE user_id = _uid LIMIT 1;
  _phone := COALESCE(NULLIF(trim(_whatsapp), ''), _customer.phone);
  _email := COALESCE(public.normalize_email(_manager_email), public.normalize_email(_customer.email));

  IF public.normalize_phone10(_phone) IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.vendors v
    WHERE public.normalize_phone10(v.whatsapp) = public.normalize_phone10(_phone)
      AND v.user_id <> _uid
  ) THEN
    RAISE EXCEPTION 'Vendor mobile number already registered';
  END IF;

  IF public.normalize_email(_email) IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.vendors v
    WHERE public.normalize_email(coalesce(v.email, v.manager_email)) = public.normalize_email(_email)
      AND v.user_id <> _uid
  ) THEN
    RAISE EXCEPTION 'Vendor email already registered';
  END IF;

  INSERT INTO public.vendors (
    user_id, role, owner_name, entity, trade, deals_in, business_name, whatsapp,
    manager_email, email, referral, instagram, facebook, website, google_place_id,
    aadhaar, pan, gst, plan, status
  ) VALUES (
    _uid, _role, NULLIF(trim(_owner_name), ''), _entity, _trade, _deals_in,
    NULLIF(trim(_business_name), ''), NULLIF(trim(_phone), ''), _email, _email,
    NULLIF(trim(_referral), ''), NULLIF(trim(_instagram), ''), NULLIF(trim(_facebook), ''),
    NULLIF(trim(_website), ''), NULLIF(trim(_google_place_id), ''), NULLIF(trim(_aadhaar), ''),
    NULLIF(trim(_pan), ''), NULLIF(trim(_gst), ''), _plan, 'pending'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    role = EXCLUDED.role,
    owner_name = EXCLUDED.owner_name,
    entity = EXCLUDED.entity,
    trade = EXCLUDED.trade,
    deals_in = EXCLUDED.deals_in,
    business_name = EXCLUDED.business_name,
    whatsapp = EXCLUDED.whatsapp,
    manager_email = EXCLUDED.manager_email,
    email = EXCLUDED.email,
    referral = EXCLUDED.referral,
    instagram = EXCLUDED.instagram,
    facebook = EXCLUDED.facebook,
    website = EXCLUDED.website,
    google_place_id = EXCLUDED.google_place_id,
    aadhaar = EXCLUDED.aadhaar,
    pan = EXCLUDED.pan,
    gst = EXCLUDED.gst,
    plan = EXCLUDED.plan,
    status = COALESCE(public.vendors.status, 'pending'),
    updated_at = now()
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_vendor_profile(text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text) TO authenticated;