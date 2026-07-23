CREATE OR REPLACE FUNCTION public.auto_match_lead_vendors(_lead_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  l record;
  radius_km numeric;
  matched_count integer := 0;
  slots integer := 5;
  matched_vendor_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  SELECT * INTO l FROM public.leads WHERE id = _lead_id;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() <> l.customer_id AND NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  radius_km := COALESCE(l.radius_km, l.search_radius_km, 1);
  slots := GREATEST(5, COALESCE(l.max_slots, 5));

  WITH candidate_vendors AS (
    SELECT
      v.user_id AS vendor_user_id,
      COALESCE(l.sub_category_name, 'auto') AS sub_category_name,
      CASE
        WHEN l.lat IS NOT NULL AND l.lng IS NOT NULL
          AND COALESCE(v.live_lat, v.lat) IS NOT NULL
          AND COALESCE(v.live_lng, v.lng) IS NOT NULL THEN
          (6371 * acos(GREATEST(-1, LEAST(1,
            cos(radians(l.lat)) * cos(radians(COALESCE(v.live_lat, v.lat))) * cos(radians(COALESCE(v.live_lng, v.lng)) - radians(l.lng))
            + sin(radians(l.lat)) * sin(radians(COALESCE(v.live_lat, v.lat)))
          ))))
        ELSE 0
      END AS distance_km,
      EXISTS (
        SELECT 1
        FROM public.vendor_item_mappings m
        WHERE (m.vendor_id = v.user_id OR m.vendor_id = v.id)
          AND COALESCE(m.is_active, true) = true
          AND array_length(l.item_ids, 1) IS NOT NULL
          AND m.item_id = ANY(l.item_ids)
      ) AS item_match,
      EXISTS (
        SELECT 1
        FROM public.vendor_item_mappings m
        JOIN public.catalog_items ci ON ci.id = m.item_id
        WHERE (m.vendor_id = v.user_id OR m.vendor_id = v.id)
          AND COALESCE(m.is_active, true) = true
          AND l.sub_category_id IS NOT NULL
          AND ci.category_id = l.sub_category_id
      ) AS category_match,
      COALESCE(v.is_online, false) AS is_online,
      COALESCE(v.is_premium, false) AS is_premium
    FROM public.vendors v
    WHERE COALESCE(v.is_blocked, false) = false
      AND v.status = 'active'
      AND v.user_id IS NOT NULL
      AND v.user_id <> l.customer_id
      AND COALESCE(v.live_lat, v.lat) IS NOT NULL
      AND COALESCE(v.live_lng, v.lng) IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.lead_notifications n
        WHERE n.lead_id = _lead_id
          AND n.vendor_id = v.user_id
      )
  ), ranked AS (
    SELECT vendor_user_id, sub_category_name
    FROM candidate_vendors
    ORDER BY
      CASE
        WHEN radius_km = 0 OR distance_km <= radius_km THEN 0
        ELSE 1
      END,
      CASE
        WHEN item_match THEN 0
        WHEN category_match THEN 1
        ELSE 2
      END,
      is_online DESC,
      is_premium DESC,
      distance_km ASC NULLS LAST,
      vendor_user_id ASC
    LIMIT slots
  ), inserted AS (
    INSERT INTO public.lead_notifications (
      lead_id,
      vendor_id,
      sub_category_name,
      status,
      responded_at,
      auto_matched
    )
    SELECT
      _lead_id,
      vendor_user_id,
      sub_category_name,
      'accepted',
      now(),
      true
    FROM ranked
    ON CONFLICT DO NOTHING
    RETURNING vendor_id
  )
  SELECT COALESCE(array_agg(vendor_id), ARRAY[]::uuid[]), count(*)
  INTO matched_vendor_ids, matched_count
  FROM inserted;

  IF matched_count > 0 THEN
    PERFORM set_config('app.lead_system_update', 'on', true);
    UPDATE public.leads
    SET accepted_vendor_ids = (
        SELECT ARRAY(
          SELECT DISTINCT x
          FROM unnest(COALESCE(public.leads.accepted_vendor_ids, ARRAY[]::uuid[]) || matched_vendor_ids) AS x
        )
      ),
      accepted_count = GREATEST(COALESCE(public.leads.accepted_count, 0), cardinality(
        ARRAY(
          SELECT DISTINCT x
          FROM unnest(COALESCE(public.leads.accepted_vendor_ids, ARRAY[]::uuid[]) || matched_vendor_ids) AS x
        )
      )),
      accepted_vendor_id = COALESCE(public.leads.accepted_vendor_id, matched_vendor_ids[1]),
      accepted_at = COALESCE(public.leads.accepted_at, now()),
      status = CASE WHEN public.leads.status = 'new' THEN 'accepted' ELSE public.leads.status END,
      updated_at = now()
    WHERE id = _lead_id;
  END IF;

  RETURN matched_count;
END;
$$;

REVOKE ALL ON FUNCTION public.auto_match_lead_vendors(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.auto_match_lead_vendors(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_match_lead_vendors(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.get_lead_accepted_vendors(_lead_id uuid)
RETURNS TABLE(vendor_id uuid, business_name text, owner_name text, avatar_url text, whatsapp text, phone text, email text, rating numeric, total_reviews integer, distance_km numeric, vendor_note text, quoted_price numeric, price_min numeric, price_max numeric, mapping_notes text, cover_image_url text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH lead_row AS (
    SELECT * FROM public.leads WHERE id = _lead_id
  ), accepted AS (
    SELECT n.vendor_id AS vendor_user_id, n.vendor_note, n.quoted_price
    FROM public.lead_notifications n
    WHERE n.lead_id = _lead_id AND n.status = 'accepted'
    UNION ALL
    SELECT unnest(l.accepted_vendor_ids), NULL::text, NULL::numeric
    FROM lead_row l
  ), accepted_dedup AS (
    SELECT DISTINCT ON (vendor_user_id) vendor_user_id, vendor_note, quoted_price
    FROM accepted
    ORDER BY vendor_user_id, quoted_price NULLS LAST, vendor_note NULLS LAST
  ), ratings AS (
    SELECT accepted_vendor_id AS vid,
           ROUND(AVG(lead_rating)::numeric, 1) AS avg_rating,
           COUNT(*)::int AS cnt
    FROM public.leads
    WHERE lead_rating IS NOT NULL AND accepted_vendor_id IS NOT NULL
    GROUP BY accepted_vendor_id
  ), mapping_pick AS (
    SELECT DISTINCT ON (a.vendor_user_id)
      a.vendor_user_id,
      m.price_min,
      m.price_max,
      m.notes AS mapping_notes,
      ci.image_url AS catalog_cover_image_url
    FROM accepted_dedup a
    JOIN public.vendors v ON v.user_id = a.vendor_user_id
    JOIN lead_row l ON true
    LEFT JOIN public.vendor_item_mappings m
      ON (m.vendor_id = a.vendor_user_id OR m.vendor_id = v.id)
     AND COALESCE(m.is_active, true) = true
     AND (
       (array_length(l.item_ids, 1) IS NOT NULL AND m.item_id = ANY(l.item_ids))
       OR (
         l.sub_category_id IS NOT NULL
         AND EXISTS (
           SELECT 1 FROM public.catalog_items ci2
           WHERE ci2.id = m.item_id
             AND ci2.category_id = l.sub_category_id
         )
       )
     )
    LEFT JOIN public.catalog_items ci ON ci.id = m.item_id
    ORDER BY a.vendor_user_id, m.updated_at DESC NULLS LAST, m.created_at DESC NULLS LAST
  )
  SELECT DISTINCT ON (v.user_id)
    v.user_id,
    v.business_name,
    v.owner_name,
    COALESCE(
      NULLIF(v.profile_photo_url, ''),
      NULLIF(v.avatar_url, ''),
      (SELECT NULLIF(c.avatar_url, '') FROM public.customers c WHERE c.user_id = v.user_id LIMIT 1)
    ) AS avatar_url,
    v.whatsapp,
    COALESCE(NULLIF(v.whatsapp,''), (SELECT c.phone FROM public.customers c WHERE c.user_id = v.user_id LIMIT 1)) AS phone,
    COALESCE(v.email, v.manager_email, (SELECT c.email FROM public.customers c WHERE c.user_id = v.user_id LIMIT 1)) AS email,
    COALESCE((SELECT avg_rating FROM ratings WHERE vid = v.user_id), 4.8) AS rating,
    COALESCE((SELECT cnt FROM ratings WHERE vid = v.user_id), 0) AS total_reviews,
    CASE
      WHEN COALESCE(v.live_lat, v.lat) IS NOT NULL AND COALESCE(v.live_lng, v.lng) IS NOT NULL AND l.lat IS NOT NULL AND l.lng IS NOT NULL THEN
        ROUND((6371 * acos(
          GREATEST(-1, LEAST(1,
            cos(radians(l.lat)) * cos(radians(COALESCE(v.live_lat, v.lat))) * cos(radians(COALESCE(v.live_lng, v.lng)) - radians(l.lng))
            + sin(radians(l.lat)) * sin(radians(COALESCE(v.live_lat, v.lat)))
          ))
        ))::numeric, 1)
      ELSE NULL
    END AS distance_km,
    a.vendor_note,
    COALESCE(a.quoted_price, mp.price_min) AS quoted_price,
    mp.price_min,
    mp.price_max,
    mp.mapping_notes,
    COALESCE(NULLIF(v.cover_image_url, ''), mp.catalog_cover_image_url, l.images[1]) AS cover_image_url
  FROM lead_row l
  JOIN accepted_dedup a ON true
  JOIN public.vendors v ON v.user_id = a.vendor_user_id
  LEFT JOIN mapping_pick mp ON mp.vendor_user_id = a.vendor_user_id
  WHERE COALESCE(v.is_blocked, false) = false
    AND (auth.uid() = l.customer_id OR auth.uid() = a.vendor_user_id OR is_admin_user(auth.uid()))
  ORDER BY v.user_id, v.updated_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_lead_accepted_vendors(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_lead_accepted_vendors(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lead_accepted_vendors(uuid) TO service_role;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT id
    FROM public.leads
    WHERE source = 'quick_home'
      AND created_at > now() - interval '24 hours'
      AND COALESCE(accepted_count, 0) < 5
      AND customer_approved_vendor_id IS NULL
    ORDER BY created_at DESC
    LIMIT 20
  LOOP
    PERFORM public.auto_match_lead_vendors(r.id);
  END LOOP;
END;
$$;