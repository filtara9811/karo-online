-- Phase 2: Radius sliders for both Vendor and User
-- Convention: radius_km = 0 means Unlimited

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS service_radius_km integer NOT NULL DEFAULT 10;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS search_radius_km integer NOT NULL DEFAULT 10;

-- Rewrite broadcast_next_lead_batch to honor BOTH user and vendor radii.
-- Effective match radius = min(user_radius, vendor_radius), where 0 (unlimited) on either side is skipped.
CREATE OR REPLACE FUNCTION public.broadcast_next_lead_batch(
  _lead_id uuid,
  _batch_size integer DEFAULT 3
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead          public.leads%ROWTYPE;
  v_remaining     integer;
  v_user_radius   integer;
  v_picked        uuid[];
  v_stale_after   interval := interval '10 minutes';
BEGIN
  SELECT * INTO v_lead FROM public.leads WHERE id = _lead_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('done', true, 'reason', 'lead_not_found', 'vendor_ids', '[]'::jsonb);
  END IF;

  v_remaining := GREATEST(0, COALESCE(v_lead.max_slots, 5) - COALESCE(v_lead.accepted_count, 0));
  IF v_remaining <= 0 THEN
    RETURN jsonb_build_object('done', true, 'reason', 'cap_reached', 'vendor_ids', '[]'::jsonb);
  END IF;

  v_user_radius := COALESCE(v_lead.search_radius_km, 10);

  -- Pick the nearest eligible vendors not already notified for this lead
  WITH eligible AS (
    SELECT
      v.id AS vendor_id,
      -- effective coordinates based on operation mode
      CASE
        WHEN v.operation_mode = 'dynamic'
             AND v.live_lat IS NOT NULL AND v.live_lng IS NOT NULL
             AND v.location_updated_at IS NOT NULL
             AND v.location_updated_at > (now() - v_stale_after)
          THEN v.live_lat
        ELSE v.lat
      END AS eff_lat,
      CASE
        WHEN v.operation_mode = 'dynamic'
             AND v.live_lat IS NOT NULL AND v.live_lng IS NOT NULL
             AND v.location_updated_at IS NOT NULL
             AND v.location_updated_at > (now() - v_stale_after)
          THEN v.live_lng
        ELSE v.lng
      END AS eff_lng,
      COALESCE(v.service_radius_km, 10) AS vendor_radius
    FROM public.vendors v
    WHERE v.is_active = true
      AND v.is_online IS NOT FALSE
      AND v.user_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.lead_notifications ln
        WHERE ln.lead_id = _lead_id AND ln.vendor_id = v.user_id
      )
  ),
  scored AS (
    SELECT
      e.vendor_id,
      (
        6371 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians(v_lead.lat)) * cos(radians(e.eff_lat)) *
            cos(radians(e.eff_lng) - radians(v_lead.lng)) +
            sin(radians(v_lead.lat)) * sin(radians(e.eff_lat))
          ))
        )
      ) AS distance_km,
      e.vendor_radius
    FROM eligible e
    WHERE e.eff_lat IS NOT NULL AND e.eff_lng IS NOT NULL
      AND v_lead.lat IS NOT NULL AND v_lead.lng IS NOT NULL
  ),
  filtered AS (
    SELECT s.vendor_id, s.distance_km
    FROM scored s
    WHERE
      -- vendor's own radius (0 = unlimited)
      (s.vendor_radius = 0 OR s.distance_km <= s.vendor_radius)
      -- user's search radius (0 = unlimited)
      AND (v_user_radius = 0 OR s.distance_km <= v_user_radius)
      -- hard cap 50 km to avoid runaway when both unlimited
      AND s.distance_km <= 50
    ORDER BY s.distance_km ASC
    LIMIT _batch_size
  )
  SELECT COALESCE(array_agg(vendor_id), ARRAY[]::uuid[]) INTO v_picked FROM filtered;

  IF array_length(v_picked, 1) IS NULL OR array_length(v_picked, 1) = 0 THEN
    RETURN jsonb_build_object('done', true, 'reason', 'no_more_vendors', 'vendor_ids', '[]'::jsonb);
  END IF;

  INSERT INTO public.lead_notifications (lead_id, vendor_id, sub_category_name, status)
  SELECT _lead_id, vid, v_lead.sub_category_name, 'pending'
  FROM unnest(v_picked) AS vid;

  RETURN jsonb_build_object(
    'done', false,
    'vendor_ids', to_jsonb(v_picked),
    'count', array_length(v_picked, 1)
  );
END;
$$;