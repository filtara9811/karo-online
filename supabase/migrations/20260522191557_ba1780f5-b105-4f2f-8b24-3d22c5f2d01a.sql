
-- Roll back the security-definer views
DROP VIEW IF EXISTS public.customer_profile_audit_safe;
DROP VIEW IF EXISTS public.kyc_verifications_subject_safe;

-- Re-add customer self-read policy on profile audit
CREATE POLICY "Customers see their own profile audit"
ON public.customer_profile_audit
FOR SELECT
TO authenticated
USING (auth.uid() = customer_user_id);

-- Re-add subject self-read on kyc_verifications
CREATE POLICY "kyc_verifications_subject_read"
ON public.kyc_verifications
FOR SELECT
TO authenticated
USING (subject_user_id = auth.uid());

-- Column-level privilege restriction for customer_profile_audit
REVOKE SELECT ON public.customer_profile_audit FROM authenticated, anon;
GRANT SELECT
  (id, customer_user_id, field_name, old_value, new_value, verified_via_otp, changed_by, created_at)
  ON public.customer_profile_audit TO authenticated;
GRANT INSERT ON public.customer_profile_audit TO authenticated;

-- Column-level privilege restriction for kyc_verifications
REVOKE SELECT ON public.kyc_verifications FROM authenticated, anon;
GRANT SELECT
  (id, subject_user_id, subject_type, check_type, method, status, reference_id, verified_at, created_at, updated_at)
  ON public.kyc_verifications TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.kyc_verifications TO authenticated;
