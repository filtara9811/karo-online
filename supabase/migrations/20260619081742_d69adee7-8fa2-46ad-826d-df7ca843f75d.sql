
-- 1. customer_profile_audit: re-scope policies to {authenticated}
DROP POLICY IF EXISTS "Authenticated users insert their own profile audit" ON public.customer_profile_audit;
DROP POLICY IF EXISTS "Admins see all profile audit" ON public.customer_profile_audit;

CREATE POLICY "Authenticated users insert their own profile audit"
  ON public.customer_profile_audit
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = customer_user_id OR public.is_admin_user(auth.uid()));

CREATE POLICY "Admins see all profile audit"
  ON public.customer_profile_audit
  FOR SELECT
  TO authenticated
  USING (public.is_admin_user(auth.uid()));

-- 2. otp_codes: explicit deny on client INSERT (service role bypasses RLS).
DROP POLICY IF EXISTS "otp_codes_no_client_insert" ON public.otp_codes;
CREATE POLICY "otp_codes_no_client_insert"
  ON public.otp_codes
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (false);
