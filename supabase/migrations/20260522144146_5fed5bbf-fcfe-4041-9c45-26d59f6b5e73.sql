ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS current_team_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS van_count integer NOT NULL DEFAULT 0;

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
  _plan text,
  _current_team_count integer DEFAULT 1,
  _van_count integer DEFAULT 0
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
    aadhaar, pan, gst, plan, status, current_team_count, van_count
  ) VALUES (
    _uid, _role, NULLIF(trim(_owner_name), ''), _entity, _trade, _deals_in,
    NULLIF(trim(_business_name), ''), NULLIF(trim(_phone), ''), _email, _email,
    NULLIF(trim(_referral), ''), NULLIF(trim(_instagram), ''), NULLIF(trim(_facebook), ''),
    NULLIF(trim(_website), ''), NULLIF(trim(_google_place_id), ''), NULLIF(trim(_aadhaar), ''),
    NULLIF(trim(_pan), ''), NULLIF(trim(_gst), ''), _plan, 'pending',
    GREATEST(1, COALESCE(_current_team_count, 1)), GREATEST(0, COALESCE(_van_count, 0))
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
    current_team_count = EXCLUDED.current_team_count,
    van_count = EXCLUDED.van_count,
    status = COALESCE(public.vendors.status, 'pending'),
    updated_at = now()
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_vendor_profile(text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, integer, integer) TO authenticated;