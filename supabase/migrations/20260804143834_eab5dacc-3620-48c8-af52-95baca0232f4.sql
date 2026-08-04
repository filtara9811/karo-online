CREATE OR REPLACE FUNCTION public.log_referral_visit_lead(_code text, _source text, _name text, _phone text, _fp_hash text DEFAULT NULL::text, _user_agent text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  SELECT user_id INTO _ref FROM public.referral_codes
   WHERE upper(code) = upper(btrim(_code)) LIMIT 1;

  INSERT INTO public.referral_link_visits
    (referrer_user_id, code, source, fp_hash, user_agent, visitor_name, visitor_phone)
  VALUES (_ref, btrim(_code), _source, _fp_hash, _user_agent, left(_nm, 80), _p10);

  RETURN jsonb_build_object('ok', true);
END $function$;

CREATE OR REPLACE FUNCTION public.log_referral_visit(_code text, _source text, _fp_hash text DEFAULT NULL::text, _ip_hash text DEFAULT NULL::text, _user_agent text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _ref uuid;
BEGIN
  IF _source NOT IN ('link','qr','card') THEN RETURN; END IF;

  SELECT user_id INTO _ref FROM public.referral_codes
   WHERE upper(code) = upper(btrim(_code)) LIMIT 1;

  IF _fp_hash IS NOT NULL AND _ref IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.referral_link_visits
      WHERE referrer_user_id = _ref AND source = _source AND fp_hash = _fp_hash
        AND created_at > now() - interval '24 hours'
    ) THEN RETURN; END IF;
  END IF;

  INSERT INTO public.referral_link_visits (referrer_user_id, code, source, fp_hash, ip_hash, user_agent)
  VALUES (_ref, btrim(_code), _source, _fp_hash, _ip_hash, _user_agent);
END $function$;