GRANT SELECT, INSERT, UPDATE, DELETE ON public.sms_gateways TO authenticated;
GRANT ALL ON public.sms_gateways TO service_role;

GRANT SELECT, DELETE ON public.system_logs TO authenticated;
GRANT ALL ON public.system_logs TO service_role;

GRANT ALL ON public.otp_codes TO service_role;