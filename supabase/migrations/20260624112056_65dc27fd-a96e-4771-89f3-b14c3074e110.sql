CREATE OR REPLACE FUNCTION public.list_marketplace_leads_for_vendor()
RETURNS TABLE (
  id uuid,
  sub_category_name text,
  item_names text[],
  note text,
  images text[],
  address text,
  lat double precision,
  lng double precision,
  group_name text,
  accepted_count int,
  max_slots int,
  lead_price_inr numeric,
  marketplace_reason text,
  marketplace_at timestamptz,
  created_at timestamptz,
  distance_km numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vendor public.vendors%ROWTYPE;
BEGIN
  SELECT * INTO v_vendor FROM public.vendors WHERE user_id = auth.uid();
  IF NOT FOUND THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    l.id,
    l.sub_category_name,
    l.item_names,
    l.note,
    l.images,
    l.address,
    l.lat,
    l.lng,
    l.group_name,
    l.accepted_count,
    l.max_slots,
    l.lead_price_inr,
    l.marketplace_reason,
    l.marketplace_at,
    l.created_at,
    CASE
      WHEN l.lat IS NOT NULL AND l.lng IS NOT NULL
        AND COALESCE(v_vendor.lat, v_vendor.live_lat) IS NOT NULL
        AND COALESCE(v_vendor.lng, v_vendor.live_lng) IS NOT NULL
      THEN ROUND(
        (6371 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians(COALESCE(v_vendor.lat, v_vendor.live_lat))) * cos(radians(l.lat))
            * cos(radians(l.lng) - radians(COALESCE(v_vendor.lng, v_vendor.live_lng)))
            + sin(radians(COALESCE(v_vendor.lat, v_vendor.live_lat))) * sin(radians(l.lat))
          ))
        ))::numeric, 2)
      ELSE NULL
    END AS distance_km
  FROM public.leads l
  WHERE l.is_marketplace = true
    AND l.status NOT IN ('fulfilled', 'cancelled', 'expired')
    AND COALESCE(l.accepted_count, 0) < COALESCE(l.max_slots, 5)
    AND NOT (auth.uid() = ANY (COALESCE(l.accepted_vendor_ids, ARRAY[]::uuid[])))
  ORDER BY l.marketplace_at DESC NULLS LAST, l.created_at DESC
  LIMIT 100;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_marketplace_leads_for_vendor() TO authenticated;