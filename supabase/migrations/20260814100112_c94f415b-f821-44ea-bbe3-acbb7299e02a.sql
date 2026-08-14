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
  SELECT jsonb_agg(row_to_json(x)::jsonb ORDER BY x.created_at DESC) INTO _out
  FROM (
    SELECT g.id, g.last_at AS created_at, g.visits, g.visitor_name, g.visitor_phone,
           g.source, g.medium, g.user_agent, g.project_slug,
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
             SELECT nullif(btrim(coalesce(c.address,'')),'') FROM public.customers c
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

GRANT EXECUTE ON FUNCTION public.get_qr_visitor_feed(text, integer) TO authenticated;