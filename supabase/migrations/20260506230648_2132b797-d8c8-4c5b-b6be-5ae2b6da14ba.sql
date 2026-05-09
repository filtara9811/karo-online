REVOKE ALL ON FUNCTION public.accept_lead(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_lead(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.accept_lead(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_lead_accepted_vendors(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_lead_accepted_vendors(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_lead_accepted_vendors(uuid) TO authenticated;