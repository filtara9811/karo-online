REVOKE SELECT (response_payload) ON public.kyc_verifications FROM authenticated;
REVOKE SELECT (response_payload) ON public.kyc_verifications FROM anon;
GRANT SELECT (response_payload) ON public.kyc_verifications TO service_role;