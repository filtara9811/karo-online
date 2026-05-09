
-- 1) Vendor item mappings: require approved vendor on insert, limit public read to approved vendors
DROP POLICY IF EXISTS "Vendors insert their mappings" ON public.vendor_item_mappings;
CREATE POLICY "Vendors insert their mappings"
  ON public.vendor_item_mappings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.user_id = auth.uid()
        AND v.user_id = vendor_item_mappings.vendor_id
        AND COALESCE(v.is_blocked, false) = false
        AND v.status IN ('active','approved')
    )
  );

DROP POLICY IF EXISTS "Public can view active mappings" ON public.vendor_item_mappings;
CREATE POLICY "Public can view active mappings"
  ON public.vendor_item_mappings
  FOR SELECT
  TO public
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.user_id = vendor_item_mappings.vendor_id
        AND COALESCE(v.is_blocked, false) = false
        AND v.status IN ('active','approved')
    )
  );

-- 2) Vendor variation mappings: same hardening
DROP POLICY IF EXISTS "Vendors insert their var mappings" ON public.vendor_variation_mappings;
CREATE POLICY "Vendors insert their var mappings"
  ON public.vendor_variation_mappings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.user_id = auth.uid()
        AND v.user_id = vendor_variation_mappings.vendor_id
        AND COALESCE(v.is_blocked, false) = false
        AND v.status IN ('active','approved')
    )
  );

DROP POLICY IF EXISTS "Public can view active var mappings" ON public.vendor_variation_mappings;
CREATE POLICY "Public can view active var mappings"
  ON public.vendor_variation_mappings
  FOR SELECT
  TO public
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.user_id = vendor_variation_mappings.vendor_id
        AND COALESCE(v.is_blocked, false) = false
        AND v.status IN ('active','approved')
    )
  );

-- 3) Add explicit admin SELECT on vendors for clarity/auditability
DROP POLICY IF EXISTS "Admins view all vendors" ON public.vendors;
CREATE POLICY "Admins view all vendors"
  ON public.vendors
  FOR SELECT
  TO authenticated
  USING (public.is_admin_user(auth.uid()));
