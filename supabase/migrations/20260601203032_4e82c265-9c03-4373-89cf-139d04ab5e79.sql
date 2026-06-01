REVOKE ALL ON FUNCTION public.broadcast_next_lead_batch(uuid, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.broadcast_next_lead_batch(uuid, integer, integer) FROM anon;
REVOKE ALL ON FUNCTION public.broadcast_next_lead_batch(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.broadcast_next_lead_batch(uuid, integer) FROM anon;

GRANT EXECUTE ON FUNCTION public.broadcast_next_lead_batch(uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.broadcast_next_lead_batch(uuid, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.broadcast_next_lead_batch(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.broadcast_next_lead_batch(uuid, integer) TO service_role;