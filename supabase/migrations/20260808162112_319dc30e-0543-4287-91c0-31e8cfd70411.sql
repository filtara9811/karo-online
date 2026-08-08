DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'qr_event_type') THEN
    CREATE TYPE public.qr_event_type AS ENUM (
      'QR_SCAN','STORE_VIEW','PRODUCT_VIEW','PRODUCT_ENQUIRY','WHATSAPP_CLICK',
      'CALL_CLICK','ORDER_CREATED','PAYMENT_COMPLETED','REVIEW_SUBMITTED',
      'CAMPAIGN_CLICK','AD_CLICK','PWA_INSTALL','CHAT'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.qr_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  event_type public.qr_event_type NOT NULL,
  code text,
  project_slug text,
  owner_user_id uuid,
  device_fp text,
  identity_id uuid,
  visitor_name text,
  visitor_phone text,
  ref_id text,
  amount_inr numeric,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_agent text
);

CREATE INDEX IF NOT EXISTS qr_events_owner_created_idx ON public.qr_events (owner_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS qr_events_code_created_idx ON public.qr_events (code, created_at DESC);
CREATE INDEX IF NOT EXISTS qr_events_type_idx ON public.qr_events (event_type);

GRANT SELECT ON public.qr_events TO authenticated;
GRANT ALL ON public.qr_events TO service_role;

ALTER TABLE public.qr_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners read own qr events" ON public.qr_events;
CREATE POLICY "Owners read own qr events" ON public.qr_events
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid() OR public.is_admin_user(auth.uid()));

CREATE OR REPLACE FUNCTION public.track_qr_event(
  _event text,
  _code text DEFAULT NULL,
  _project text DEFAULT NULL,
  _fp_hash text DEFAULT NULL,
  _ref text DEFAULT NULL,
  _amount numeric DEFAULT NULL,
  _meta jsonb DEFAULT '{}'::jsonb,
  _user_agent text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _t public.qr_event_type; _owner uuid; _ident public.customer_identities%ROWTYPE;
BEGIN
  BEGIN
    _t := upper(btrim(coalesce(_event,'')))::public.qr_event_type;
  EXCEPTION WHEN others THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'bad_event');
  END;

  IF _code IS NOT NULL THEN
    SELECT user_id INTO _owner FROM public.referral_codes
      WHERE upper(code) = upper(btrim(_code)) LIMIT 1;
  END IF;

  IF _fp_hash IS NOT NULL AND length(_fp_hash) >= 4 THEN
    SELECT * INTO _ident FROM public.customer_identities
      WHERE _fp_hash = ANY(device_fps) ORDER BY last_seen_at DESC LIMIT 1;
  END IF;

  INSERT INTO public.qr_events
    (event_type, code, project_slug, owner_user_id, device_fp, identity_id,
     visitor_name, visitor_phone, ref_id, amount_inr, meta, user_agent)
  VALUES
    (_t, nullif(btrim(coalesce(_code,'')),''), nullif(btrim(coalesce(_project,'')),''),
     _owner, _fp_hash, _ident.id, left(_ident.name, 80), _ident.mobile,
     left(nullif(btrim(coalesce(_ref,'')),''), 120), _amount,
     coalesce(_meta, '{}'::jsonb), left(coalesce(_user_agent,''), 400));

  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE ALL ON FUNCTION public.track_qr_event(text, text, text, text, text, numeric, jsonb, text) FROM public;
GRANT EXECUTE ON FUNCTION public.track_qr_event(text, text, text, text, text, numeric, jsonb, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.remember_customer_device(
  _fp_hash text,
  _name text DEFAULT NULL,
  _phone text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _p10 text; _nm text; _row public.customer_identities%ROWTYPE;
BEGIN
  IF _fp_hash IS NULL OR length(_fp_hash) < 4 THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  _p10 := right(regexp_replace(coalesce(_phone,''), '\D', '', 'g'), 10);
  _nm := nullif(btrim(coalesce(_name,'')), '');

  IF length(_p10) = 10 THEN
    SELECT * INTO _row FROM public.customer_identities WHERE mobile = _p10 LIMIT 1;
    IF FOUND THEN
      UPDATE public.customer_identities
         SET device_fps = (CASE WHEN _fp_hash = ANY(device_fps) THEN device_fps
                                ELSE array_append(device_fps, _fp_hash) END),
             name = coalesce(_nm, name),
             last_seen_at = now(),
             verified_at = coalesce(verified_at, now()),
             updated_at = now()
       WHERE id = _row.id
       RETURNING * INTO _row;
    ELSE
      INSERT INTO public.customer_identities (mobile, name, device_fps, verified_at, last_seen_at)
      VALUES (_p10, _nm, ARRAY[_fp_hash], now(), now())
      RETURNING * INTO _row;
    END IF;
  ELSE
    SELECT * INTO _row FROM public.customer_identities
      WHERE _fp_hash = ANY(device_fps) ORDER BY last_seen_at DESC LIMIT 1;
    IF NOT FOUND THEN RETURN jsonb_build_object('found', false); END IF;
    UPDATE public.customer_identities SET last_seen_at = now() WHERE id = _row.id;
  END IF;

  RETURN jsonb_build_object('found', true, 'identity_id', _row.id, 'name', _row.name, 'mobile', _row.mobile);
END $$;

REVOKE ALL ON FUNCTION public.remember_customer_device(text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.remember_customer_device(text, text, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.log_referral_visit_lead(_code text, _source text, _name text, _phone text, _fp_hash text DEFAULT NULL::text, _user_agent text DEFAULT NULL::text, _project text DEFAULT NULL::text)
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
    (referrer_user_id, code, source, fp_hash, user_agent, visitor_name, visitor_phone, project_slug)
  VALUES (_ref, btrim(_code), _source, _fp_hash, _user_agent, left(_nm, 80), _p10, nullif(btrim(coalesce(_project,'')), ''));

  PERFORM public.remember_customer_device(_fp_hash, _nm, _p10);

  INSERT INTO public.qr_events
    (event_type, code, project_slug, owner_user_id, device_fp, visitor_name, visitor_phone, user_agent)
  VALUES ('QR_SCAN', btrim(_code), nullif(btrim(coalesce(_project,'')), ''), _ref, _fp_hash, left(_nm, 80), _p10, left(coalesce(_user_agent,''), 400));

  RETURN jsonb_build_object('ok', true);
END $function$;