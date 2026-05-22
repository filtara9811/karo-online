
-- 1. customer_profile_audit: drop customer self-read policy, expose safe view
DROP POLICY IF EXISTS "Customers see their own profile audit" ON public.customer_profile_audit;

CREATE OR REPLACE VIEW public.customer_profile_audit_safe
WITH (security_invoker = false) AS
SELECT
  id,
  customer_user_id,
  field_name,
  old_value,
  new_value,
  verified_via_otp,
  created_at
FROM public.customer_profile_audit
WHERE customer_user_id = auth.uid() OR public.is_admin_user(auth.uid());

GRANT SELECT ON public.customer_profile_audit_safe TO authenticated;

-- 2. kyc_verifications: drop subject read policy, expose safe view
DROP POLICY IF EXISTS "kyc_verifications_subject_read" ON public.kyc_verifications;

CREATE OR REPLACE VIEW public.kyc_verifications_subject_safe
WITH (security_invoker = false) AS
SELECT
  id,
  subject_user_id,
  subject_type,
  check_type,
  status,
  verified_at,
  created_at,
  updated_at
FROM public.kyc_verifications
WHERE subject_user_id = auth.uid() OR public.is_admin_user(auth.uid());

GRANT SELECT ON public.kyc_verifications_subject_safe TO authenticated;
