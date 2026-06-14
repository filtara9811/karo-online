
-- Tighten chat-media UPDATE/DELETE to require lead participation, mirroring SELECT policy
DROP POLICY IF EXISTS "chat-media participants update" ON storage.objects;
DROP POLICY IF EXISTS "chat-media participants delete" ON storage.objects;

CREATE POLICY "chat-media participants update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'chat-media'
  AND auth.uid() IS NOT NULL
  AND (
    is_admin_user(auth.uid())
    OR (
      owner = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.leads l
        WHERE l.id::text = (storage.foldername(objects.name))[1]
          AND (
            l.customer_id = auth.uid()
            OR auth.uid() = ANY (COALESCE(l.accepted_vendor_ids, ARRAY[]::uuid[]))
            OR auth.uid() = l.accepted_vendor_id
          )
      )
    )
  )
);

CREATE POLICY "chat-media participants delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'chat-media'
  AND auth.uid() IS NOT NULL
  AND (
    is_admin_user(auth.uid())
    OR (
      owner = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.leads l
        WHERE l.id::text = (storage.foldername(objects.name))[1]
          AND (
            l.customer_id = auth.uid()
            OR auth.uid() = ANY (COALESCE(l.accepted_vendor_ids, ARRAY[]::uuid[]))
            OR auth.uid() = l.accepted_vendor_id
          )
      )
    )
  )
);

-- Allow KYC document owners to delete their own files
CREATE POLICY "KYC docs - owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
