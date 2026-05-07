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
  SELECT * INTO _lead FROM public.leads WHERE id = _lead_id FOR UPDATE;
  IF _lead.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF auth.uid() <> _lead.customer_id AND NOT is_admin_user(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authorized');
  END IF;

  SELECT COALESCE(array_agg(id), '{}') INTO _sub_item_ids
  FROM public.catalog_items
  WHERE category_id = _lead.sub_category_id AND is_active = true;

  IF _lead.lat IS NOT NULL AND _lead.lng IS NOT NULL THEN
    FOREACH _band IN ARRAY _bands LOOP
      EXIT WHEN _found >= _target;

      FOR _row IN
        WITH candidates AS (
          SELECT DISTINCT v.user_id AS vendor_id, v.lat, v.lng, true AS mapped
          FROM public.vendors v
          JOIN public.vendor_item_mappings m ON m.vendor_id = v.user_id AND m.is_active = true
          WHERE COALESCE(v.is_blocked, false) = false
            AND COALESCE(v.status, 'active') = 'active'
            AND v.lat IS NOT NULL AND v.lng IS NOT NULL
            AND (m.item_id = ANY(_sub_item_ids) OR _sub_item_ids = '{}')
            AND NOT (v.user_id = ANY(_vendor_ids))
          UNION
          SELECT DISTINCT v.user_id AS vendor_id, v.lat, v.lng, false AS mapped
          FROM public.vendors v
          WHERE COALESCE(v.is_blocked, false) = false
            AND COALESCE(v.status, 'active') = 'active'
            AND v.lat IS NOT NULL AND v.lng IS NOT NULL
            AND NOT (v.user_id = ANY(_vendor_ids))
        )
        SELECT vendor_id,
          (6371 * acos(GREATEST(-1, LEAST(1,
            cos(radians(_lead.lat)) * cos(radians(lat)) * cos(radians(lng) - radians(_lead.lng))
            + sin(radians(_lead.lat)) * sin(radians(lat))
          )))) AS dist_km,
          mapped
        FROM candidates
        ORDER BY mapped DESC, dist_km ASC
      LOOP
        EXIT WHEN _found >= _target;
        IF _row.dist_km <= _band THEN
          _vendor_ids := array_append(_vendor_ids, _row.vendor_id);
          _found := _found + 1;
        END IF;
      END LOOP;
    END LOOP;
  END IF;

  IF _found < _target THEN
    FOR _row IN
      WITH mapped_candidates AS (
        SELECT DISTINCT v.user_id AS vendor_id, true AS mapped,
          CASE
            WHEN _lead.lat IS NOT NULL AND _lead.lng IS NOT NULL AND v.lat IS NOT NULL AND v.lng IS NOT NULL THEN
              (6371 * acos(GREATEST(-1, LEAST(1,
                cos(radians(_lead.lat)) * cos(radians(v.lat)) * cos(radians(v.lng) - radians(_lead.lng))
                + sin(radians(_lead.lat)) * sin(radians(v.lat))
              ))))
            ELSE 999999
          END AS dist_km,
          v.updated_at
        FROM public.vendors v
        JOIN public.vendor_item_mappings m ON m.vendor_id = v.user_id AND m.is_active = true
        WHERE COALESCE(v.is_blocked, false) = false
          AND COALESCE(v.status, 'active') = 'active'
          AND (m.item_id = ANY(_sub_item_ids) OR _sub_item_ids = '{}')
          AND NOT (v.user_id = ANY(_vendor_ids))
      ), fallback_candidates AS (
        SELECT DISTINCT v.user_id AS vendor_id, false AS mapped,
          CASE
            WHEN _lead.lat IS NOT NULL AND _lead.lng IS NOT NULL AND v.lat IS NOT NULL AND v.lng IS NOT NULL THEN
              (6371 * acos(GREATEST(-1, LEAST(1,
                cos(radians(_lead.lat)) * cos(radians(v.lat)) * cos(radians(v.lng) - radians(_lead.lng))
                + sin(radians(_lead.lat)) * sin(radians(v.lat))
              ))))
            ELSE 999999
          END AS dist_km,
          v.updated_at
        FROM public.vendors v
        WHERE COALESCE(v.is_blocked, false) = false
          AND COALESCE(v.status, 'active') = 'active'
          AND NOT (v.user_id = ANY(_vendor_ids))
      )
      SELECT vendor_id
      FROM (
        SELECT * FROM mapped_candidates
        UNION
        SELECT * FROM fallback_candidates
      ) c
      ORDER BY mapped DESC, dist_km ASC, updated_at DESC NULLS LAST
      LIMIT (_target - _found)
    LOOP
      _vendor_ids := array_append(_vendor_ids, _row.vendor_id);
      _found := _found + 1;
    END LOOP;
  END IF;

  IF array_length(_vendor_ids, 1) > 0 THEN
    INSERT INTO public.lead_notifications (lead_id, vendor_id, sub_category_name)
    SELECT _lead_id, vid, _lead.sub_category_name
    FROM unnest(_vendor_ids) AS vid
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_notifications n
      WHERE n.lead_id = _lead_id AND n.vendor_id = vid
    );
  END IF;

  UPDATE public.leads
    SET max_slots = CASE WHEN _found > 0 THEN _found ELSE 1 END,
        status = CASE WHEN _found > 0 THEN 'searching_complete' ELSE 'no_vendor_available' END,
        updated_at = now()
    WHERE id = _lead_id;

  RETURN jsonb_build_object('ok', true, 'notified', _found, 'vendor_ids', to_jsonb(_vendor_ids));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.match_lead_vendors(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.match_lead_vendors(uuid) TO authenticated;