
-- 1) Public function to read the active maps key (key is referrer-restricted at Google)
CREATE OR REPLACE FUNCTION public.get_active_maps_key()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'provider', provider,
    'api_key', api_key,
    'map_sdk_key', map_sdk_key
  )
  FROM public.maps_services
  WHERE is_active = true
  ORDER BY priority ASC NULLS LAST
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_active_maps_key() TO anon, authenticated;

-- 2) Expanded gateway health
CREATE OR REPLACE FUNCTION public.get_gateway_health()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _result jsonb;
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT jsonb_build_object(
    'sms', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'provider', g.provider,
        'display_name', g.display_name,
        'is_active', g.is_active,
        'is_test_mode', g.is_test_mode,
        'last_error', (SELECT message FROM public.system_logs WHERE kind='sms' AND provider=g.provider AND status='error' ORDER BY created_at DESC LIMIT 1),
        'last_error_meta', (SELECT meta FROM public.system_logs WHERE kind='sms' AND provider=g.provider AND status='error' ORDER BY created_at DESC LIMIT 1),
        'last_error_at', (SELECT created_at FROM public.system_logs WHERE kind='sms' AND provider=g.provider AND status='error' ORDER BY created_at DESC LIMIT 1),
        'last_success_at', (SELECT created_at FROM public.system_logs WHERE kind='sms' AND provider=g.provider AND status='success' ORDER BY created_at DESC LIMIT 1)
      )) FROM public.sms_gateways g
    ), '[]'::jsonb),
    'payment', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'provider', g.provider,
        'display_name', g.display_name,
        'is_active', g.is_active,
        'is_test_mode', g.is_test_mode,
        'last_error', (SELECT message FROM public.system_logs WHERE kind='payment' AND provider=g.provider AND status='error' ORDER BY created_at DESC LIMIT 1),
        'last_error_meta', (SELECT meta FROM public.system_logs WHERE kind='payment' AND provider=g.provider AND status='error' ORDER BY created_at DESC LIMIT 1),
        'last_error_at', (SELECT created_at FROM public.system_logs WHERE kind='payment' AND provider=g.provider AND status='error' ORDER BY created_at DESC LIMIT 1),
        'last_success_at', (SELECT created_at FROM public.system_logs WHERE kind='payment' AND provider=g.provider AND status='success' ORDER BY created_at DESC LIMIT 1)
      )) FROM public.payment_gateways g
    ), '[]'::jsonb),
    'maps', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'provider', g.provider,
        'display_name', g.display_name,
        'is_active', g.is_active,
        'is_test_mode', g.is_test_mode,
        'last_error', (SELECT message FROM public.system_logs WHERE kind='maps' AND provider=g.provider AND status='error' ORDER BY created_at DESC LIMIT 1),
        'last_error_meta', (SELECT meta FROM public.system_logs WHERE kind='maps' AND provider=g.provider AND status='error' ORDER BY created_at DESC LIMIT 1),
        'last_error_at', (SELECT created_at FROM public.system_logs WHERE kind='maps' AND provider=g.provider AND status='error' ORDER BY created_at DESC LIMIT 1),
        'last_success_at', (SELECT created_at FROM public.system_logs WHERE kind='maps' AND provider=g.provider AND status='success' ORDER BY created_at DESC LIMIT 1)
      )) FROM public.maps_services g
    ), '[]'::jsonb),
    'firebase', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'provider', g.service_key,
        'display_name', g.display_name,
        'is_active', g.is_active,
        'is_test_mode', g.is_test_mode,
        'last_error', (SELECT message FROM public.system_logs WHERE kind='firebase' AND provider=g.service_key AND status='error' ORDER BY created_at DESC LIMIT 1),
        'last_error_meta', (SELECT meta FROM public.system_logs WHERE kind='firebase' AND provider=g.service_key AND status='error' ORDER BY created_at DESC LIMIT 1),
        'last_error_at', (SELECT created_at FROM public.system_logs WHERE kind='firebase' AND provider=g.service_key AND status='error' ORDER BY created_at DESC LIMIT 1),
        'last_success_at', (SELECT created_at FROM public.system_logs WHERE kind='firebase' AND provider=g.service_key AND status='success' ORDER BY created_at DESC LIMIT 1)
      )) FROM public.firebase_services g
    ), '[]'::jsonb),
    'logistics', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'provider', g.provider,
        'display_name', g.display_name,
        'is_active', g.is_active,
        'is_test_mode', g.is_test_mode,
        'last_error', (SELECT message FROM public.system_logs WHERE kind='logistics' AND provider=g.provider AND status='error' ORDER BY created_at DESC LIMIT 1),
        'last_error_meta', (SELECT meta FROM public.system_logs WHERE kind='logistics' AND provider=g.provider AND status='error' ORDER BY created_at DESC LIMIT 1),
        'last_error_at', (SELECT created_at FROM public.system_logs WHERE kind='logistics' AND provider=g.provider AND status='error' ORDER BY created_at DESC LIMIT 1),
        'last_success_at', (SELECT created_at FROM public.system_logs WHERE kind='logistics' AND provider=g.provider AND status='success' ORDER BY created_at DESC LIMIT 1)
      )) FROM public.logistics_gateways g
    ), '[]'::jsonb),
    'recent_errors', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', l.id, 'kind', l.kind, 'provider', l.provider,
        'message', l.message, 'meta', l.meta, 'created_at', l.created_at
      ) ORDER BY l.created_at DESC) FROM (
        SELECT * FROM public.system_logs WHERE status='error' ORDER BY created_at DESC LIMIT 50
      ) l
    ), '[]'::jsonb)
  ) INTO _result;
  RETURN _result;
END;
$$;
