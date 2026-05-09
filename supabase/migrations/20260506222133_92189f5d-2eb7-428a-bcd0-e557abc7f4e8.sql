REVOKE ALL ON FUNCTION public.is_lead_owner(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_lead_owner(uuid, uuid) TO authenticated;