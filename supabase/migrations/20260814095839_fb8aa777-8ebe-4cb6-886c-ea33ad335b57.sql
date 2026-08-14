ALTER TABLE public.referral_link_visits
  ADD COLUMN IF NOT EXISTS medium text,
  ADD COLUMN IF NOT EXISTS city text;

CREATE OR REPLACE FUNCTION public.log_referral_visit(_code text, _source text, _fp_hash text DEFAULT NULL::text, _ip_hash text DEFAULT NULL::text, _user_agent text DEFAULT NULL::text, _medium text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _ref uuid; _med text;
BEGIN
  IF _source NOT IN ('link','qr','card') THEN RETURN; END IF;

  _med := lower(nullif(btrim(coalesce(_medium,'')),''));
  IF _med IS NOT NULL AND _med NOT IN ('instagram','youtube','facebook','whatsapp','x','telegram','google','link','qr','card') THEN
    _med := NULL;
  END IF;

  SELECT user_id INTO _ref FROM public.referral_codes
   WHERE upper(code) = upper(btrim(_code)) LIMIT 1;

  IF _fp_hash IS NOT NULL AND _ref IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.referral_link_visits
      WHERE referrer_user_id = _ref AND source = _source AND fp_hash = _fp_hash
        AND created_at > now() - interval '24 hours'
    ) THEN RETURN; END IF;
  END IF;

  INSERT INTO public.referral_link_visits (referrer_user_id, code, source, fp_hash, ip_hash, user_agent, medium)
  VALUES (_ref, btrim(_code), _source, _fp_hash, _ip_hash, _user_agent, _med);
END $function$;

CREATE OR REPLACE FUNCTION public.get_qr_dashboard_analytics(_project text DEFAULT NULL::text, _days integer DEFAULT 7)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _n int := greatest(1, least(coalesce(_days,7), 90));
  _from date := (current_date - (_n - 1));
  _days_json jsonb;
  _totals jsonb;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false); END IF;

  WITH d AS (
    SELECT generate_series(_from, current_date, interval '1 day')::date AS day
  ),
  v AS (
    SELECT created_at::date AS day, fp_hash, visitor_phone
      FROM public.referral_link_visits
     WHERE referrer_user_id = _uid
       AND created_at::date >= _from
       AND (_project IS NULL OR project_slug IS NULL OR project_slug = _project)
  ),
  e AS (
    SELECT created_at::date AS day, event_type, coalesce(amount_inr,0) AS amount
      FROM public.qr_events
     WHERE owner_user_id = _uid
       AND created_at::date >= _from
       AND (_project IS NULL OR project_slug IS NULL OR project_slug = _project)
  ),
  t AS (
    SELECT created_at::date AS day, kind, status, visitor_phone
      FROM public.shop_threads
     WHERE merchant_user_id = _uid
       AND created_at::date >= _from
  )
  SELECT jsonb_agg(jsonb_build_object(
    'day', d.day,
    'visitors', (SELECT count(*) FROM v WHERE v.day = d.day),
    'unique', (SELECT count(DISTINCT coalesce(v.fp_hash, v.visitor_phone, random()::text)) FROM v WHERE v.day = d.day),
    'customers', (SELECT count(DISTINCT v.visitor_phone) FROM v WHERE v.day = d.day AND v.visitor_phone IS NOT NULL),
    'downloads', (SELECT count(*) FROM e WHERE e.day = d.day AND e.event_type = 'PWA_INSTALL'),
    'feedback', (SELECT count(*) FROM e WHERE e.day = d.day AND e.event_type = 'REVIEW_SUBMITTED'),
    'inquiries', (SELECT count(*) FROM t WHERE t.day = d.day AND t.kind = 'inquiry'),
    'orders', (SELECT count(*) FROM t WHERE t.day = d.day AND t.kind = 'order'),
    'pending', (SELECT count(*) FROM t WHERE t.day = d.day AND t.status IN ('open','pending','new')),
    'earnings', (SELECT coalesce(sum(e.amount),0) FROM e WHERE e.day = d.day AND e.event_type = 'PAYMENT_COMPLETED')
  ) ORDER BY d.day)
  INTO _days_json
  FROM d;

  SELECT jsonb_build_object(
    'visits', (SELECT count(*) FROM public.referral_link_visits WHERE referrer_user_id = _uid),
    'unique', (SELECT count(DISTINCT coalesce(fp_hash, visitor_phone, id::text)) FROM public.referral_link_visits WHERE referrer_user_id = _uid),
    'customers', (SELECT count(DISTINCT visitor_phone) FROM public.referral_link_visits WHERE referrer_user_id = _uid AND visitor_phone IS NOT NULL),
    'bounced', (SELECT count(*) FROM public.referral_link_visits WHERE referrer_user_id = _uid AND visitor_phone IS NULL),
    'downloads', (SELECT count(*) FROM public.qr_events WHERE owner_user_id = _uid AND event_type = 'PWA_INSTALL'),
    'feedback', (SELECT count(*) FROM public.qr_events WHERE owner_user_id = _uid AND event_type = 'REVIEW_SUBMITTED'),
    'inquiries', (SELECT count(*) FROM public.shop_threads WHERE merchant_user_id = _uid AND kind = 'inquiry'),
    'orders', (SELECT count(*) FROM public.shop_threads WHERE merchant_user_id = _uid AND kind = 'order'),
    'pending', (SELECT count(*) FROM public.shop_threads WHERE merchant_user_id = _uid AND status IN ('open','pending','new')),
    'earnings', (SELECT coalesce(sum(coalesce(amount_inr,0)),0) FROM public.qr_events WHERE owner_user_id = _uid AND event_type = 'PAYMENT_COMPLETED')
  ) INTO _totals;

  RETURN jsonb_build_object('ok', true, 'days', coalesce(_days_json,'[]'::jsonb), 'totals', _totals);
END $function$;

CREATE OR REPLACE FUNCTION public.get_qr_visitor_feed(_project text DEFAULT NULL::text, _limit integer DEFAULT 40)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid(); _out jsonb;
BEGIN
  IF _uid IS NULL THEN RETURN '[]'::jsonb; END IF;

  WITH v AS (
    SELECT id, created_at, source, medium, city, user_agent, visitor_name, visitor_phone, project_slug, fp_hash,
           coalesce(nullif(right(regexp_replace(coalesce(visitor_phone,''), '\D', '', 'g'), 10), ''),
                    lower(nullif(btrim(coalesce(visitor_name,'')),'')),
                    coalesce(fp_hash, id::text)) AS grp
      FROM public.referral_link_visits
     WHERE referrer_user_id = _uid
       AND (_project IS NULL OR project_slug IS NULL OR project_slug = _project)
  ),
  g AS (
    SELECT grp,
           max(created_at) AS last_at,
           count(*)::int AS visits,
           (array_agg(visitor_name ORDER BY created_at DESC))[1] AS visitor_name,
           (array_agg(visitor_phone ORDER BY created_at DESC))[1] AS visitor_phone,
           (array_agg(source ORDER BY created_at DESC))[1] AS source,
           (array_agg(medium ORDER BY created_at DESC))[1] AS medium,
           (array_agg(city ORDER BY created_at DESC))[1] AS city,
           (array_agg(user_agent ORDER BY created_at DESC))[1] AS user_agent,
           (array_agg(project_slug ORDER BY created_at DESC))[1] AS project_slug,
           (array_agg(id ORDER BY created_at DESC))[1] AS id
      FROM v GROUP BY grp
  )
  SELECT jsonb_agg(row_to_json(x)::jsonb ORDER BY x.last_at DESC) INTO _out
  FROM (
    SELECT g.id, g.last_at AS created_at, g.visits, g.visitor_name, g.visitor_phone,
           g.source, g.medium, g.city, g.user_agent, g.project_slug,
           coalesce((
             SELECT jsonb_agg(jsonb_build_object(
                      'kind', st.kind, 'product_name', st.product_name,
                      'product_image', st.product_image, 'status', st.status)
                    ORDER BY st.created_at DESC)
               FROM public.shop_threads st
              WHERE st.merchant_user_id = _uid
                AND st.visitor_phone IS NOT NULL
                AND g.visitor_phone IS NOT NULL
                AND right(regexp_replace(st.visitor_phone, '\D', '', 'g'), 10)
                    = right(regexp_replace(g.visitor_phone, '\D', '', 'g'), 10)
           ), '[]'::jsonb) AS threads,
           coalesce((
             SELECT c.city FROM public.customers c
              WHERE g.visitor_phone IS NOT NULL
                AND right(regexp_replace(coalesce(c.phone,''), '\D', '', 'g'), 10)
                    = right(regexp_replace(g.visitor_phone, '\D', '', 'g'), 10)
              LIMIT 1
           ), g.city) AS resolved_city
      FROM g
     ORDER BY g.last_at DESC
     LIMIT greatest(1, least(coalesce(_limit, 40), 200))
  ) x;

  RETURN coalesce(_out, '[]'::jsonb);
END $function$;

GRANT EXECUTE ON FUNCTION public.get_qr_dashboard_analytics(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_qr_visitor_feed(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_referral_visit(text, text, text, text, text, text) TO anon, authenticated;