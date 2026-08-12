-- Restrict subject self-update policy to signed-in users only
DROP POLICY IF EXISTS kyc_verifications_subject_update ON public.kyc_verifications;
CREATE POLICY kyc_verifications_subject_update
ON public.kyc_verifications
FOR UPDATE
TO authenticated
USING (
  subject_user_id = auth.uid()
  AND status = ANY (ARRAY['todo'::text, 'submitted'::text, 'rejected'::text])
)
WITH CHECK (
  subject_user_id = auth.uid()
  AND status = ANY (ARRAY['todo'::text, 'submitted'::text])
);

-- Column-level privileges: non-admin roles may only write applicant-submitted fields.
REVOKE UPDATE ON public.kyc_verifications FROM authenticated;
REVOKE UPDATE ON public.kyc_verifications FROM anon;
GRANT UPDATE (document_number, document_urls, request_payload, status, updated_at)
  ON public.kyc_verifications TO authenticated;
GRANT ALL ON public.kyc_verifications TO service_role;
