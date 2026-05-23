DROP FUNCTION IF EXISTS public.get_lead_accepted_vendors(uuid);

CREATE OR REPLACE FUNCTION public.get_lead_accepted_vendors(_lead_id uuid)
RETURNS TABLE(
  vendor_id uuid,
  business_name text,
  owner_name text,
  avatar_url text,
  whatsapp text,
  phone text,
  email text,
  rating numeric,
  total_reviews integer,
  distance_km numeric,
  vendor_note text,
  quoted_price numeric,
  price_min numeric,
  price_max numeric,
  mapping_notes text,
  cover_image_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      ci.image_url AS cover_image_url
    FROM accepted_dedup a
    JOIN lead_row l ON true
    LEFT JOIN public.vendor_item_mappings m
      ON m.vendor_id = a.vendor_user_id
     AND m.is_active = true
     AND (
       (array_length(l.item_ids, 1) IS NOT NULL AND m.item_id = ANY(l.item_ids))
       OR (
         array_length(l.item_ids, 1) IS NULL
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
    COALESCE(NULLIF(v.avatar_url, ''), (SELECT NULLIF(c.avatar_url, '') FROM public.customers c WHERE c.user_id = v.user_id LIMIT 1)) AS avatar_url,
    v.whatsapp,
    COALESCE(NULLIF(v.whatsapp,''), (SELECT c.phone FROM public.customers c WHERE c.user_id = v.user_id LIMIT 1)) AS phone,
    COALESCE(v.email, v.manager_email, (SELECT c.email FROM public.customers c WHERE c.user_id = v.user_id LIMIT 1)) AS email,
    COALESCE((SELECT avg_rating FROM ratings WHERE vid = v.user_id), 4.8) AS rating,
    COALESCE((SELECT cnt FROM ratings WHERE vid = v.user_id), 0) AS total_reviews,
    CASE
      WHEN v.lat IS NOT NULL AND v.lng IS NOT NULL AND l.lat IS NOT NULL AND l.lng IS NOT NULL THEN
        ROUND((6371 * acos(
          GREATEST(-1, LEAST(1,
            cos(radians(l.lat)) * cos(radians(v.lat)) * cos(radians(v.lng) - radians(l.lng))
            + sin(radians(l.lat)) * sin(radians(v.lat))
          ))
        ))::numeric, 1)
      ELSE NULL
    END AS distance_km,
    a.vendor_note,
    COALESCE(a.quoted_price, mp.price_min) AS quoted_price,
    mp.price_min,
    mp.price_max,
    mp.mapping_notes,
    COALESCE(mp.cover_image_url, l.images[1]) AS cover_image_url
  FROM lead_row l
  JOIN accepted_dedup a ON true
  JOIN public.vendors v ON v.user_id = a.vendor_user_id
  LEFT JOIN mapping_pick mp ON mp.vendor_user_id = a.vendor_user_id
  WHERE COALESCE(v.is_blocked, false) = false
    AND (auth.uid() = l.customer_id OR auth.uid() = a.vendor_user_id OR is_admin_user(auth.uid()))
  ORDER BY v.user_id, v.updated_at DESC;
$function$;

REVOKE ALL ON FUNCTION public.get_lead_accepted_vendors(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_lead_accepted_vendors(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_lead_accepted_vendors(uuid) TO authenticated;