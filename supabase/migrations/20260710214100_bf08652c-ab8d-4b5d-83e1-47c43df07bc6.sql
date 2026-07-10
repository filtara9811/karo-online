
-- Fix 1: prevent vendors from self-promoting (verified/is_premium/status) via UPDATE
DROP POLICY IF EXISTS "Vendors update own row" ON public.vendors;
CREATE POLICY "Vendors update own row" ON public.vendors
FOR UPDATE
USING ((auth.uid() = user_id) OR public.is_admin_user(auth.uid()))
WITH CHECK (
  public.is_admin_user(auth.uid())
  OR (
    auth.uid() = user_id
    AND (pan IS NULL OR pan = (SELECT v2.pan FROM public.vendors v2 WHERE v2.user_id = vendors.user_id))
    AND (aadhaar IS NULL OR aadhaar = (SELECT v2.aadhaar FROM public.vendors v2 WHERE v2.user_id = vendors.user_id))
    AND (gst IS NULL OR gst = (SELECT v2.gst FROM public.vendors v2 WHERE v2.user_id = vendors.user_id))
    AND verified   IS NOT DISTINCT FROM (SELECT v2.verified   FROM public.vendors v2 WHERE v2.user_id = vendors.user_id)
    AND is_premium IS NOT DISTINCT FROM (SELECT v2.is_premium FROM public.vendors v2 WHERE v2.user_id = vendors.user_id)
    AND status     IS NOT DISTINCT FROM (SELECT v2.status     FROM public.vendors v2 WHERE v2.user_id = vendors.user_id)
  )
);

-- Fix 2: prevent KYC subject from self-approving; only allow moving into 'submitted'
DROP POLICY IF EXISTS "kyc_verifications_subject_update" ON public.kyc_verifications;
CREATE POLICY "kyc_verifications_subject_update" ON public.kyc_verifications
FOR UPDATE
USING (
  subject_user_id = auth.uid()
  AND status = ANY (ARRAY['todo'::text, 'submitted'::text, 'rejected'::text])
)
WITH CHECK (
  subject_user_id = auth.uid()
  AND status = ANY (ARRAY['todo'::text, 'submitted'::text])
);
