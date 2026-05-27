CREATE OR REPLACE VIEW public.vendors_public AS
SELECT id, user_id, business_name, owner_name, avatar_url, status, lat, lng, service_radius_km, verified, trade, is_blocked
FROM public.vendors
WHERE COALESCE(is_blocked, false) = false
  AND status IN ('active', 'approved');

GRANT SELECT ON public.vendors_public TO authenticated, anon;