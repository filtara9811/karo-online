
-- Fix vendor_item_mappings DELETE/UPDATE policies (vendor_id = vendors.id, not auth.uid())
DROP POLICY IF EXISTS "Vendors delete own mappings" ON public.vendor_item_mappings;
DROP POLICY IF EXISTS "Vendors update own mappings" ON public.vendor_item_mappings;
CREATE POLICY "Vendors delete own mappings" ON public.vendor_item_mappings
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_item_mappings.vendor_id AND v.user_id = auth.uid()));
CREATE POLICY "Vendors update own mappings" ON public.vendor_item_mappings
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_item_mappings.vendor_id AND v.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_item_mappings.vendor_id AND v.user_id = auth.uid()));

-- Fix vendor_variation_mappings DELETE/UPDATE policies
DROP POLICY IF EXISTS "Vendors delete own var mappings" ON public.vendor_variation_mappings;
DROP POLICY IF EXISTS "Vendors update own var mappings" ON public.vendor_variation_mappings;
CREATE POLICY "Vendors delete own var mappings" ON public.vendor_variation_mappings
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_variation_mappings.vendor_id AND v.user_id = auth.uid()));
CREATE POLICY "Vendors update own var mappings" ON public.vendor_variation_mappings
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_variation_mappings.vendor_id AND v.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_variation_mappings.vendor_id AND v.user_id = auth.uid()));

-- Fix vendor_wallets SELECT policy
DROP POLICY IF EXISTS "Vendors view own wallet" ON public.vendor_wallets;
CREATE POLICY "Vendors view own wallet" ON public.vendor_wallets
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_wallets.vendor_id AND v.user_id = auth.uid()));
