
-- Phase 1: Vendor Operation Mode
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS operation_mode text NOT NULL DEFAULT 'static',
  ADD COLUMN IF NOT EXISTS live_lat double precision,
  ADD COLUMN IF NOT EXISTS live_lng double precision;

ALTER TABLE public.vendors
  DROP CONSTRAINT IF EXISTS vendors_operation_mode_chk;
ALTER TABLE public.vendors
  ADD CONSTRAINT vendors_operation_mode_chk
  CHECK (operation_mode IN ('static','dynamic'));

-- Rewrite matching engine to use effective coords per operation_mode
CREATE OR REPLACE FUNCTION public.broadcast_next_lead_batch(_lead_id uuid, _batch_size integer DEFAULT 3)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _lead public.leads%ROWTYPE;
  _caller uuid := auth.uid();
  _sub_item_ids uuid[] := '{}';
  _vendor_ids uuid[] := '{}';
  _row record;
  _added int := 0;
  _accepted int;
  _cap int;
  _max_radius numeric := 15;
  _stale_after interval := interval '10 minutes';
BEGIN
  IF _caller IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'auth_required');
  END IF;

  SELECT * INTO _lead FROM public.leads WHERE id = _lead_id FOR UPDATE;
  IF _lead.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;
  IF _caller <> _lead.customer_id AND NOT public.is_admin_user(_caller) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authorized');
  END IF;

  _accepted := COALESCE(_lead.accepted_count, 0);
  _cap := COALESCE(_lead.max_slots, 5);

  IF _accepted >= _cap THEN
    RETURN jsonb_build_object('ok', true, 'done', true, 'notified', 0,
      'accepted', _accepted, 'cap', _cap, 'vendor_ids', '[]'::jsonb);
  END IF;

  IF _lead.lat IS NULL OR _lead.lng IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'lead_no_location');
  END IF;

  SELECT COALESCE(array_agg(id), '{}') INTO _sub_item_ids
    FROM public.catalog_items
    WHERE category_id = _lead.sub_category_id AND is_active = true;

  FOR _row IN
    WITH already AS (
      SELECT vendor_id FROM public.lead_notifications WHERE lead_id = _lead_id
    ),
    candidates AS (
      SELECT
        v.user_id AS vendor_id,
        EXISTS (
          SELECT 1 FROM public.vendor_item_mappings m
           WHERE m.is_active = true
             AND m.vendor_id = v.user_id
             AND (_sub_item_ids = '{}' OR m.item_id = ANY(_sub_item_ids))
        ) AS mapped,
        -- Effective coords: dynamic + recent live fix → live; else shop
        CASE
          WHEN v.operation_mode = 'dynamic'
               AND v.live_lat IS NOT NULL AND v.live_lng IS NOT NULL
               AND v.location_updated_at IS NOT NULL
               AND v.location_updated_at > (now() - _stale_after)
          THEN v.live_lat ELSE v.lat
        END AS eff_lat,
        CASE
          WHEN v.operation_mode = 'dynamic'
               AND v.live_lat IS NOT NULL AND v.live_lng IS NOT NULL
               AND v.location_updated_at IS NOT NULL
               AND v.location_updated_at > (now() - _stale_after)
          THEN v.live_lng ELSE v.lng
        END AS eff_lng,
        COALESCE(v.service_radius_km, 10) AS svc_radius,
        v.updated_at
      FROM public.vendors v
      WHERE v.user_id IS NOT NULL
        AND COALESCE(v.is_blocked, false) = false
        AND COALESCE(v.status, 'active') = 'active'
        AND v.user_id <> _lead.customer_id
        AND v.user_id NOT IN (SELECT vendor_id FROM already)
    ),
    with_dist AS (
      SELECT vendor_id, mapped, svc_radius, updated_at,
        (6371 * acos(GREATEST(-1, LEAST(1,
            cos(radians(_lead.lat)) * cos(radians(eff_lat)) * cos(radians(eff_lng) - radians(_lead.lng))
            + sin(radians(_lead.lat)) * sin(radians(eff_lat))
        )))) AS dist_km
      FROM candidates
      WHERE eff_lat IS NOT NULL AND eff_lng IS NOT NULL
    )
    SELECT vendor_id, mapped, dist_km
      FROM with_dist
     WHERE dist_km <= LEAST(_max_radius, svc_radius)
     ORDER BY mapped DESC, dist_km ASC, updated_at DESC NULLS LAST
     LIMIT GREATEST(_batch_size, 1)
  LOOP
    _vendor_ids := array_append(_vendor_ids, _row.vendor_id);
    _added := _added + 1;
  END LOOP;

  IF _added > 0 THEN
    INSERT INTO public.lead_notifications (lead_id, vendor_id, sub_category_name)
    SELECT _lead_id, vid, COALESCE(_lead.sub_category_name, 'Service')
    FROM unnest(_vendor_ids) AS vid
    ON CONFLICT (lead_id, vendor_id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'done', (_added = 0),
    'notified', _added,
    'accepted', _accepted,
    'cap', _cap,
    'vendor_ids', to_jsonb(_vendor_ids)
  );
END;
$function$;
