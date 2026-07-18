CREATE OR REPLACE FUNCTION public.auto_match_lead_vendors(_lead_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

  -- Only the lead owner or an admin can trigger matching from the app.
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
        WHERE m.vendor_id = v.user_id
          AND m.is_active = true
          AND array_length(l.item_ids, 1) IS NOT NULL
          AND m.item_id = ANY(l.item_ids)
      ) AS item_match,
      EXISTS (
        SELECT 1
        FROM public.vendor_item_mappings m
        JOIN public.catalog_items ci ON ci.id = m.item_id
        WHERE m.vendor_id = v.user_id
          AND m.is_active = true
          AND l.sub_category_id IS NOT NULL
          AND ci.category_id = l.sub_category_id
      ) AS category_match
    FROM public.vendors v
    WHERE COALESCE(v.is_blocked, false) = false
      AND v.status = 'active'
      AND v.user_id IS NOT NULL
      AND v.user_id <> l.customer_id
      AND COALESCE(v.live_lat, v.lat) IS NOT NULL
      AND COALESCE(v.live_lng, v.lng) IS NOT NULL
      AND (
        l.lat IS NULL OR l.lng IS NULL OR radius_km = 0 OR
        (6371 * acos(GREATEST(-1, LEAST(1,
          cos(radians(l.lat)) * cos(radians(COALESCE(v.live_lat, v.lat))) * cos(radians(COALESCE(v.live_lng, v.lng)) - radians(l.lng))
          + sin(radians(l.lat)) * sin(radians(COALESCE(v.live_lat, v.lat)))
        )))) <= radius_km
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.lead_notifications n
        WHERE n.lead_id = _lead_id
          AND n.vendor_id = v.user_id
      )
  ), ranked AS (
    SELECT *
    FROM candidate_vendors
    ORDER BY
      CASE
        WHEN item_match THEN 0
        WHEN category_match THEN 1
        ELSE 2
      END,
      distance_km ASC,
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

  UPDATE public.leads
  SET accepted_vendor_ids = (
      SELECT ARRAY(
        SELECT DISTINCT x
        FROM unnest(COALESCE(public.leads.accepted_vendor_ids, ARRAY[]::uuid[]) || matched_vendor_ids) AS x
      )
    ),
    status = CASE WHEN matched_count > 0 AND public.leads.status = 'new' THEN 'broadcasting' ELSE public.leads.status END,
    updated_at = now()
  WHERE id = _lead_id;

  RETURN matched_count;
END;
$$;

REVOKE ALL ON FUNCTION public.auto_match_lead_vendors(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.auto_match_lead_vendors(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.prevent_customer_privileged_self_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_merchant_link_privileged_self_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_vendor_privileged_self_update() FROM PUBLIC, anon, authenticated;