CREATE OR REPLACE FUNCTION public.broadcast_next_lead_batch(_lead_id uuid, _batch_size integer DEFAULT 5, _ring_index integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lead        public.leads%ROWTYPE;
  v_remaining   integer;
  v_user_radius integer;
  v_picked      uuid[];
  v_stale_after interval := interval '24 hours';
  v_ring_min    numeric;
  v_ring_max    numeric;
  v_hard_max    numeric;
  v_origin_lat  double precision;
  v_origin_lng  double precision;
BEGIN
  SELECT * INTO v_lead FROM public.leads WHERE id = _lead_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'done', true, 'reason', 'lead_not_found', 'vendor_ids', '[]'::jsonb, 'count', 0, 'notified', 0);
  END IF;

  v_origin_lat := v_lead.lat;
  v_origin_lng := v_lead.lng;

  IF v_origin_lat IS NULL OR v_origin_lng IS NULL THEN
    SELECT l.lat, l.lng
      INTO v_origin_lat, v_origin_lng
    FROM public.leads l
    WHERE l.customer_id = v_lead.customer_id
      AND l.id <> _lead_id
      AND l.lat IS NOT NULL
      AND l.lng IS NOT NULL
    ORDER BY l.created_at DESC
    LIMIT 1;
  END IF;

  v_remaining := GREATEST(0, COALESCE(v_lead.max_slots, 5) - COALESCE(v_lead.accepted_count, 0));
  IF v_remaining <= 0 THEN
    RETURN jsonb_build_object('ok', true, 'done', true, 'reason', 'cap_reached', 'vendor_ids', '[]'::jsonb, 'count', 0, 'notified', 0);
  END IF;

  IF v_lead.is_remote THEN
    WITH eligible AS (
      SELECT v.user_id AS vendor_id, COALESCE(v.is_premium, false) AS is_premium
      FROM public.vendors v
      WHERE v.status = 'active'
        AND COALESCE(v.is_blocked, false) = false
        AND COALESCE(v.auto_accept_leads, false) = true
        AND v.user_id IS NOT NULL
        AND v.user_id <> v_lead.customer_id
        AND COALESCE(v.is_remote_capable, false) = true
        AND COALESCE(v.vendor_type, 'retailer') = ANY (COALESCE(v_lead.vendor_types, ARRAY['wholesaler','retailer','manufacturer']::text[]))
        AND (
          COALESCE(array_length(v_lead.item_ids, 1), 0) = 0
          OR EXISTS (
            SELECT 1
            FROM public.vendor_item_mappings vim
            JOIN public.catalog_items ci ON ci.id = vim.item_id
            WHERE (vim.vendor_id = v.user_id OR vim.vendor_id = v.id)
              AND COALESCE(vim.is_active, true) = true
              AND (
                vim.item_id = ANY(v_lead.item_ids)
                OR (v_lead.sub_category_id IS NOT NULL AND ci.category_id = v_lead.sub_category_id)
              )
          )
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.lead_notifications ln
          WHERE ln.lead_id = _lead_id AND ln.vendor_id = v.user_id
        )
      ORDER BY COALESCE(v.is_premium, false) DESC, random()
      LIMIT LEAST(_batch_size, v_remaining)
    )
    SELECT COALESCE(array_agg(vendor_id), ARRAY[]::uuid[]) INTO v_picked FROM eligible;

    IF array_length(v_picked, 1) IS NULL THEN
      RETURN jsonb_build_object('ok', true, 'done', true, 'reason', 'no_remote_auto_accept_vendors', 'vendor_ids', '[]'::jsonb, 'count', 0, 'notified', 0);
    END IF;

    INSERT INTO public.lead_notifications (lead_id, vendor_id, sub_category_name, status)
    SELECT _lead_id, vid, v_lead.sub_category_name, 'pending'
    FROM unnest(v_picked) AS vid;

    RETURN jsonb_build_object('ok', true, 'done', false, 'remote', true, 'vendor_ids', to_jsonb(v_picked), 'count', array_length(v_picked, 1), 'notified', array_length(v_picked, 1));
  END IF;

  v_user_radius := COALESCE(v_lead.search_radius_km, 10);

  IF _ring_index IS NOT NULL THEN
    CASE _ring_index
      WHEN 0 THEN v_ring_min := 0; v_ring_max := 1;
      WHEN 1 THEN v_ring_min := 1; v_ring_max := 2;
      WHEN 2 THEN v_ring_min := 2; v_ring_max := 5;
      WHEN 3 THEN v_ring_min := 5; v_ring_max := 10;
      ELSE
        v_ring_min := 10;
        v_ring_max := CASE WHEN v_user_radius = 0 THEN 50 ELSE v_user_radius END;
    END CASE;
  ELSE
    v_ring_min := 0;
    v_ring_max := CASE WHEN v_user_radius = 0 THEN 50 ELSE v_user_radius END;
  END IF;

  v_hard_max := CASE WHEN v_user_radius = 0 THEN 50 ELSE LEAST(v_ring_max, v_user_radius) END;

  WITH eligible AS (
    SELECT
      v.user_id AS vendor_id,
      COALESCE(v.is_premium, false) AS is_premium,
      CASE
        WHEN COALESCE(v.operation_mode, 'static') = 'dynamic'
          AND v.live_lat IS NOT NULL
          AND v.live_lng IS NOT NULL
          AND v.location_updated_at IS NOT NULL
          AND v.location_updated_at > (now() - v_stale_after)
          THEN v.live_lat
        ELSE COALESCE(v.lat, v.live_lat)
      END AS eff_lat,
      CASE
        WHEN COALESCE(v.operation_mode, 'static') = 'dynamic'
          AND v.live_lat IS NOT NULL
          AND v.live_lng IS NOT NULL
          AND v.location_updated_at IS NOT NULL
          AND v.location_updated_at > (now() - v_stale_after)
          THEN v.live_lng
        ELSE COALESCE(v.lng, v.live_lng)
      END AS eff_lng,
      COALESCE(v.service_radius_km, 10) AS vendor_radius
    FROM public.vendors v
    WHERE v.status = 'active'
      AND COALESCE(v.is_blocked, false) = false
      AND COALESCE(v.auto_accept_leads, false) = true
      AND v.user_id IS NOT NULL
      AND v.user_id <> v_lead.customer_id
      AND COALESCE(v.vendor_type, 'retailer') = ANY (COALESCE(v_lead.vendor_types, ARRAY['wholesaler','retailer','manufacturer']::text[]))
      AND (
        COALESCE(array_length(v_lead.item_ids, 1), 0) = 0
        OR EXISTS (
          SELECT 1
          FROM public.vendor_item_mappings vim
          JOIN public.catalog_items ci ON ci.id = vim.item_id
          WHERE (vim.vendor_id = v.user_id OR vim.vendor_id = v.id)
            AND COALESCE(vim.is_active, true) = true
            AND (
              vim.item_id = ANY(v_lead.item_ids)
              OR (v_lead.sub_category_id IS NOT NULL AND ci.category_id = v_lead.sub_category_id)
            )
        )
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.lead_notifications ln
        WHERE ln.lead_id = _lead_id AND ln.vendor_id = v.user_id
      )
  ),
  scored AS (
    SELECT
      e.vendor_id,
      e.is_premium,
      CASE
        WHEN v_origin_lat IS NOT NULL AND v_origin_lng IS NOT NULL AND e.eff_lat IS NOT NULL AND e.eff_lng IS NOT NULL THEN
          6371 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians(v_origin_lat)) * cos(radians(e.eff_lat)) *
              cos(radians(e.eff_lng) - radians(v_origin_lng)) +
              sin(radians(v_origin_lat)) * sin(radians(e.eff_lat))
            ))
          )
        ELSE NULL
      END AS distance_km,
      e.vendor_radius
    FROM eligible e
  ),
  filtered AS (
    SELECT s.vendor_id, s.distance_km, s.is_premium
    FROM scored s
    WHERE (
        (v_origin_lat IS NULL OR v_origin_lng IS NULL)
        OR (
          s.distance_km >= v_ring_min
          AND s.distance_km < v_ring_max
          AND (s.vendor_radius = 0 OR s.distance_km <= s.vendor_radius)
          AND (v_user_radius = 0 OR s.distance_km <= v_user_radius)
          AND s.distance_km <= v_hard_max
        )
      )
    ORDER BY s.is_premium DESC, s.distance_km ASC NULLS LAST, random()
    LIMIT LEAST(_batch_size, v_remaining)
  )
  SELECT COALESCE(array_agg(vendor_id), ARRAY[]::uuid[]) INTO v_picked FROM filtered;

  IF array_length(v_picked, 1) IS NULL OR array_length(v_picked, 1) = 0 THEN
    RETURN jsonb_build_object(
      'ok', true, 'done', false, 'ring_empty', true, 'ring_index', _ring_index,
      'ring_min', v_ring_min, 'ring_max', v_ring_max,
      'origin_fallback', (v_origin_lat IS NOT NULL AND v_origin_lng IS NOT NULL),
      'vendor_ids', '[]'::jsonb, 'count', 0, 'notified', 0
    );
  END IF;

  INSERT INTO public.lead_notifications (lead_id, vendor_id, sub_category_name, status)
  SELECT _lead_id, vid, v_lead.sub_category_name, 'pending'
  FROM unnest(v_picked) AS vid;

  RETURN jsonb_build_object(
    'ok', true, 'done', false, 'ring_index', _ring_index,
    'ring_min', v_ring_min, 'ring_max', v_ring_max,
    'origin_fallback', (v_origin_lat IS NOT NULL AND v_origin_lng IS NOT NULL),
    'vendor_ids', to_jsonb(v_picked),
    'count', array_length(v_picked, 1),
    'notified', array_length(v_picked, 1)
  );
END;
$function$;