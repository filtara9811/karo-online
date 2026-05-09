CREATE OR REPLACE FUNCTION public.get_gateway_health()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

DROP TRIGGER IF EXISTS enforce_single_active_sms_gateway_trigger ON public.sms_gateways;
CREATE TRIGGER enforce_single_active_sms_gateway_trigger
BEFORE INSERT OR UPDATE OF is_active ON public.sms_gateways
FOR EACH ROW
EXECUTE FUNCTION public.enforce_single_active_sms_gateway();

UPDATE public.sms_gateways
SET config = jsonb_set(
  config,
  '{templates}',
  COALESCE(config->'templates', jsonb_build_array(jsonb_build_object(
    'event', 'otp',
    'label', 'OTP Login',
    'template_id', COALESCE(NULLIF(config->>'template_id', ''), '1707171446342898950'),
    'variables', '{otp}'
  ))),
  true
)
WHERE provider = 'fast2sms';