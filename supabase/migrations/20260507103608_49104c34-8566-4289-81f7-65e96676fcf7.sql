
CREATE OR REPLACE FUNCTION public.match_lead_vendors(_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _lead public.leads%ROWTYPE;
  _bands numeric[] := ARRAY[1, 3, 5, 10, 20];
  _band numeric;
  _target int := 5;
  _found int := 0;
  _vendor_ids uuid[] := '{}';
  _sub_item_ids uuid[];
  _row record;
BEGIN
  SELECT * INTO _lead FROM public.leads WHERE id = _lead_id;
  IF _lead.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  -- Only the lead's customer or an admin may trigger matching
  IF auth.uid() <> _lead.customer_id AND NOT is_admin_user(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authorized');
  END IF;

  -- Items belonging to this sub-category
  SELECT COALESCE(array_agg(id), '{}') INTO _sub_item_ids
  FROM public.catalog_items WHERE category_id = _lead.sub_category_id AND is_active = true;

  -- If we have geolocation, walk radius bands; otherwise pick any mapped vendors
  IF _lead.lat IS NOT NULL AND _lead.lng IS NOT NULL THEN
    FOREACH _band IN ARRAY _bands LOOP
      EXIT WHEN _found >= _target;

      FOR _row IN
        WITH candidates AS (
          SELECT DISTINCT v.user_id AS vendor_id, v.lat, v.lng
          FROM public.vendors v
          JOIN public.vendor_item_mappings m ON m.vendor_id = v.user_id AND m.is_active = true
          WHERE COALESCE(v.is_blocked, false) = false
            AND v.lat IS NOT NULL AND v.lng IS NOT NULL
            AND (m.item_id = ANY(_sub_item_ids) OR _sub_item_ids = '{}')
            AND NOT (v.user_id = ANY(_vendor_ids))
        )
        SELECT vendor_id,
          (6371 * acos(GREATEST(-1, LEAST(1,
            cos(radians(_lead.lat)) * cos(radians(lat)) * cos(radians(lng) - radians(_lead.lng))
            + sin(radians(_lead.lat)) * sin(radians(lat))
          )))) AS dist_km
        FROM candidates
        ORDER BY dist_km ASC
      LOOP
        EXIT WHEN _found >= _target;
        IF _row.dist_km <= _band THEN
          _vendor_ids := array_append(_vendor_ids, _row.vendor_id);
          _found := _found + 1;
        END IF;
      END LOOP;
    END LOOP;
  END IF;

  -- Fallback: still need vendors and either no geo or no geo-tagged vendors found
  IF _found < _target THEN
    FOR _row IN
      SELECT DISTINCT v.user_id AS vendor_id
      FROM public.vendors v
      JOIN public.vendor_item_mappings m ON m.vendor_id = v.user_id AND m.is_active = true
      WHERE COALESCE(v.is_blocked, false) = false
        AND (m.item_id = ANY(_sub_item_ids) OR _sub_item_ids = '{}')
        AND NOT (v.user_id = ANY(_vendor_ids))
      LIMIT (_target - _found)
    LOOP
      _vendor_ids := array_append(_vendor_ids, _row.vendor_id);
      _found := _found + 1;
    END LOOP;
  END IF;

  -- Insert notifications (idempotent-ish; ignore conflicts via WHERE NOT EXISTS)
  IF array_length(_vendor_ids, 1) > 0 THEN
    INSERT INTO public.lead_notifications (lead_id, vendor_id, sub_category_name)
    SELECT _lead_id, vid, _lead.sub_category_name
    FROM unnest(_vendor_ids) AS vid
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_notifications n
      WHERE n.lead_id = _lead_id AND n.vendor_id = vid
    );
  END IF;

  -- Lock lead so no 6th vendor can ever be added
  UPDATE public.leads
    SET max_slots = GREATEST(_found, 1),
        status = CASE WHEN _found > 0 THEN COALESCE(NULLIF(status,'new'), 'searching_complete') ELSE status END,
        updated_at = now()
    WHERE id = _lead_id;

  RETURN jsonb_build_object('ok', true, 'notified', _found, 'vendor_ids', to_jsonb(_vendor_ids));
END;
$$;
