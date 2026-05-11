
-- 1. wallet_transactions: drop vendor self-insert loophole
DROP POLICY IF EXISTS "Admins insert txns" ON public.wallet_transactions;
CREATE POLICY "Admins insert txns"
  ON public.wallet_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_user(auth.uid()));

-- 2. otp_codes: explicit admin-only read; writes stay server-side via service role
DROP POLICY IF EXISTS "Admins read otp_codes" ON public.otp_codes;
CREATE POLICY "Admins read otp_codes"
  ON public.otp_codes
  FOR SELECT
  TO authenticated
  USING (public.is_admin_user(auth.uid()));

-- 3. integration_providers: remove from realtime publication (admin-only config table)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'integration_providers'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.integration_providers';
  END IF;
END $$;
