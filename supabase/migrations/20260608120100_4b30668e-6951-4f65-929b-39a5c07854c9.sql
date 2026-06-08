
-- Allow subjects to insert/update their own KYC submissions
CREATE POLICY kyc_verifications_subject_insert
  ON public.kyc_verifications FOR INSERT TO authenticated
  WITH CHECK (subject_user_id = auth.uid());

CREATE POLICY kyc_verifications_subject_update
  ON public.kyc_verifications FOR UPDATE TO authenticated
  USING (subject_user_id = auth.uid() AND status IN ('todo','submitted','rejected'))
  WITH CHECK (subject_user_id = auth.uid());

-- Storage policies for kyc-documents bucket (create the bucket via tool)
CREATE POLICY "KYC docs - owner read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "KYC docs - owner write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "KYC docs - owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "KYC docs - admin read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'kyc-documents' AND public.is_admin_user(auth.uid()));
