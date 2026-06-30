
-- vendor_item_mappings: consolidate to join-based policies via vendors.user_id
DROP POLICY IF EXISTS "Vendors delete their mappings" ON public.vendor_item_mappings;
DROP POLICY IF EXISTS "Vendors update their mappings" ON public.vendor_item_mappings;
DROP POLICY IF EXISTS "Vendors view their mappings" ON public.vendor_item_mappings;
DROP POLICY IF EXISTS "Vendors delete own mappings" ON public.vendor_item_mappings;
DROP POLICY IF EXISTS "Vendors update own mappings" ON public.vendor_item_mappings;

CREATE POLICY "Vendors view own mappings" ON public.vendor_item_mappings
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendors v WHERE v.user_id = auth.uid() AND v.user_id = vendor_item_mappings.vendor_id) OR public.is_admin_user(auth.uid()));

CREATE POLICY "Vendors update own mappings" ON public.vendor_item_mappings
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendors v WHERE v.user_id = auth.uid() AND v.user_id = vendor_item_mappings.vendor_id) OR public.is_admin_user(auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.vendors v WHERE v.user_id = auth.uid() AND v.user_id = vendor_item_mappings.vendor_id) OR public.is_admin_user(auth.uid()));

CREATE POLICY "Vendors delete own mappings" ON public.vendor_item_mappings
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendors v WHERE v.user_id = auth.uid() AND v.user_id = vendor_item_mappings.vendor_id) OR public.is_admin_user(auth.uid()));

-- vendor_variation_mappings: same consolidation
DROP POLICY IF EXISTS "Vendors delete their var mappings" ON public.vendor_variation_mappings;
DROP POLICY IF EXISTS "Vendors update their var mappings" ON public.vendor_variation_mappings;
DROP POLICY IF EXISTS "Vendors view their var mappings" ON public.vendor_variation_mappings;
DROP POLICY IF EXISTS "Vendors delete own var mappings" ON public.vendor_variation_mappings;
DROP POLICY IF EXISTS "Vendors update own var mappings" ON public.vendor_variation_mappings;

CREATE POLICY "Vendors view own var mappings" ON public.vendor_variation_mappings
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendors v WHERE v.user_id = auth.uid() AND v.user_id = vendor_variation_mappings.vendor_id) OR public.is_admin_user(auth.uid()));

CREATE POLICY "Vendors update own var mappings" ON public.vendor_variation_mappings
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendors v WHERE v.user_id = auth.uid() AND v.user_id = vendor_variation_mappings.vendor_id) OR public.is_admin_user(auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.vendors v WHERE v.user_id = auth.uid() AND v.user_id = vendor_variation_mappings.vendor_id) OR public.is_admin_user(auth.uid()));

CREATE POLICY "Vendors delete own var mappings" ON public.vendor_variation_mappings
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendors v WHERE v.user_id = auth.uid() AND v.user_id = vendor_variation_mappings.vendor_id) OR public.is_admin_user(auth.uid()));

-- wallet_transactions: tighten SELECT to require a vendors row owned by the user
DROP POLICY IF EXISTS "Vendors view own txns" ON public.wallet_transactions;
CREATE POLICY "Vendors view own txns" ON public.wallet_transactions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendors v WHERE v.user_id = auth.uid() AND v.user_id = wallet_transactions.vendor_id) OR public.is_admin_user(auth.uid()));

-- web_forms: hide notify_emails from non-admins via column-level revoke
REVOKE SELECT (notify_emails) ON public.web_forms FROM anon, authenticated, PUBLIC;
-- service_role and table owner retain access; admin reads via service role / admin tools

-- referral_link_visits: hide raw tracking fields from referrer via column-level revoke
REVOKE SELECT (ip_hash, fp_hash, user_agent) ON public.referral_link_visits FROM anon, authenticated, PUBLIC;
