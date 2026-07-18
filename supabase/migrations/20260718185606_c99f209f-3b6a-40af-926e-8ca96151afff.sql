
-- 1. Add radius_km on leads (nullable, defaults to search_radius_km when absent)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS radius_km integer;

-- 2. Auto-match function: insert accepted lead_notifications for all mapped in-radius vendors
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
BEGIN
  SELECT * INTO l FROM public.leads WHERE id = _lead_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  radius_km := COALESCE(l.radius_km, l.search_radius_km, 10);

  INSERT INTO public.lead_notifications (lead_id, vendor_id, sub_category_name, status, responded_at)
  SELECT DISTINCT
    _lead_id,
    v.user_id,
    COALESCE(l.sub_category_name, 'auto'),
    'accepted',
    now()
  FROM public.vendors v
  WHERE COALESCE(v.is_blocked, false) = false
    AND v.status = 'active'
    AND v.lat IS NOT NULL AND v.lng IS NOT NULL
    AND (
      l.lat IS NULL OR l.lng IS NULL OR radius_km = 0 OR
      (6371 * acos(GREATEST(-1, LEAST(1,
        cos(radians(l.lat)) * cos(radians(v.lat)) * cos(radians(v.lng) - radians(l.lng))
        + sin(radians(l.lat)) * sin(radians(v.lat))
      )))) <= radius_km
    )
    AND (
      -- If lead has item_ids, require mapping match; else require sub_category match; else any vendor
      (array_length(l.item_ids, 1) IS NOT NULL AND EXISTS (
         SELECT 1 FROM public.vendor_item_mappings m
         WHERE m.vendor_id = v.user_id AND m.is_active = true AND m.item_id = ANY(l.item_ids)
      ))
      OR (array_length(l.item_ids, 1) IS NULL AND l.sub_category_id IS NOT NULL AND EXISTS (
         SELECT 1 FROM public.vendor_item_mappings m
         JOIN public.catalog_items ci ON ci.id = m.item_id
         WHERE m.vendor_id = v.user_id AND m.is_active = true AND ci.category_id = l.sub_category_id
      ))
      OR (l.sub_category_id IS NULL AND array_length(l.item_ids, 1) IS NULL)
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.lead_notifications n
      WHERE n.lead_id = _lead_id AND n.vendor_id = v.user_id
    )
  LIMIT 50;

  GET DIAGNOSTICS matched_count = ROW_COUNT;
  RETURN matched_count;
END;
$$;

REVOKE ALL ON FUNCTION public.auto_match_lead_vendors(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.auto_match_lead_vendors(uuid) TO authenticated;
