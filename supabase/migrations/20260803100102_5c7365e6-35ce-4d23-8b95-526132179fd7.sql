ALTER TABLE public.referral_link_visits
  ADD COLUMN IF NOT EXISTS visitor_name text,
  ADD COLUMN IF NOT EXISTS visitor_phone text;

CREATE OR REPLACE FUNCTION public.log_referral_visit_lead(
  _code text,
  _source text,
  _name text,
  _phone text,
  _fp_hash text DEFAULT NULL,
  _user_agent text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _ref uuid; _p10 text; _nm text;
BEGIN
  IF _source NOT IN ('link','qr','card') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'bad_source');
  END IF;
  _p10 := regexp_replace(coalesce(_phone, ''), '\D', '', 'g');
  IF length(_p10) < 10 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'bad_phone');
  END IF;
  _p10 := right(_p10, 10);
  _nm := nullif(btrim(coalesce(_name, '')), '');
  IF _nm IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'bad_name');
  END IF;

  SELECT user_id INTO _ref FROM public.customers WHERE referral_code = _code LIMIT 1;
  IF _ref IS NULL THEN
    SELECT user_id INTO _ref FROM public.vendors WHERE referral_code = _code LIMIT 1;
  END IF;

  INSERT INTO public.referral_link_visits
    (referrer_user_id, code, source, fp_hash, user_agent, visitor_name, visitor_phone)
  VALUES (_ref, _code, _source, _fp_hash, _user_agent, left(_nm, 80), _p10);

  RETURN jsonb_build_object('ok', true);
END $$;

GRANT EXECUTE ON FUNCTION public.log_referral_visit_lead(text,text,text,text,text,text) TO anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.get_referral_visits(text, integer);

CREATE OR REPLACE FUNCTION public.get_referral_visits(_source text, _limit integer DEFAULT 50)
RETURNS TABLE(id uuid, code text, source text, user_agent text, created_at timestamptz, visitor_name text, visitor_phone text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, code, source, user_agent, created_at, visitor_name, visitor_phone
    FROM public.referral_link_visits
   WHERE referrer_user_id = auth.uid()
     AND (_source = 'all' OR source = _source)
   ORDER BY created_at DESC
   LIMIT GREATEST(1, LEAST(_limit, 200));
$$;

GRANT EXECUTE ON FUNCTION public.get_referral_visits(text, integer) TO authenticated, service_role;