REVOKE EXECUTE ON FUNCTION public.match_lead_vendors(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.match_lead_vendors(uuid) TO authenticated;