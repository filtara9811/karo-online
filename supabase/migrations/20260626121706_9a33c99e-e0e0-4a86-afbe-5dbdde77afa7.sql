-- Tighten over-broad SELECT policies flagged by security scanner.

-- 1. group_communication_settings: restrict reads to admins (only operators
--    need to see internal channel/voice-agent toggles). Mutations are
--    already admin-only via the existing "Admins manage" policy.
DROP POLICY IF EXISTS "Anyone authed can read group comm settings" ON public.group_communication_settings;

CREATE POLICY "Admins read group comm settings"
  ON public.group_communication_settings
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2. vendor_variation_mappings: enumeration of which vendor offers which
--    variation should not be available to anonymous visitors. Keep the same
--    active+approved filter, but scope to authenticated users only.
DROP POLICY IF EXISTS "Public can view active var mappings" ON public.vendor_variation_mappings;

CREATE POLICY "Authenticated can view active var mappings"
  ON public.vendor_variation_mappings
  FOR SELECT
  TO authenticated
  USING (
    (is_active = true) AND EXISTS (
      SELECT 1
      FROM public.vendors v
      WHERE v.user_id = vendor_variation_mappings.vendor_id
        AND COALESCE(v.is_blocked, false) = false
        AND v.status = ANY (ARRAY['active'::text, 'approved'::text])
    )
  );

REVOKE SELECT ON public.vendor_variation_mappings FROM anon;
