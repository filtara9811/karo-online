-- 1. Drop direct vendor INSERT on coin_transfers
DROP POLICY IF EXISTS "Vendors insert transfers" ON public.coin_transfers;

-- 2. Restrict vendor_wallets INSERT to admin only
DROP POLICY IF EXISTS "Admins insert wallets" ON public.vendor_wallets;
CREATE POLICY "Admins insert wallets"
  ON public.vendor_wallets
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_user(auth.uid()));

-- 3. Remove anon blanket SELECT on referral_codes
DROP POLICY IF EXISTS "rc_public_resolve" ON public.referral_codes;