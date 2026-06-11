
-- 1) Restrict leads row visibility so accepted-but-not-chosen vendors lose access after customer picks one.
DROP POLICY IF EXISTS leads_select_authorized ON public.leads;
CREATE POLICY leads_select_authorized ON public.leads
FOR SELECT
USING (
  customer_id = auth.uid()
  OR auth.uid() = accepted_vendor_id
  OR (
    auth.uid() = ANY (COALESCE(accepted_vendor_ids, ARRAY[]::uuid[]))
    AND (customer_approved_vendor_id IS NULL OR customer_approved_vendor_id = auth.uid())
  )
  OR public.is_admin_user(auth.uid())
);

-- 2) chat-media: allow lead participants (customer + accepted vendors) and admins to read.
DROP POLICY IF EXISTS "chat-media participants read" ON storage.objects;
CREATE POLICY "chat-media participants read" ON storage.objects
FOR SELECT
USING (
  bucket_id = 'chat-media'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.is_admin_user(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id::text = (storage.foldername(name))[1]
        AND (
          l.customer_id = auth.uid()
          OR auth.uid() = ANY (COALESCE(l.accepted_vendor_ids, ARRAY[]::uuid[]))
          OR auth.uid() = l.accepted_vendor_id
        )
    )
  )
);
DROP POLICY IF EXISTS "chat-media owner read" ON storage.objects;

-- 3) feedback-screenshots: restrict reads to uploader/admin, restrict uploads to authenticated.
DROP POLICY IF EXISTS "Public can read feedback screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload feedback screenshots" ON storage.objects;

CREATE POLICY "feedback-screenshots authenticated upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'feedback-screenshots'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

CREATE POLICY "feedback-screenshots owner or admin read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'feedback-screenshots'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.is_admin_user(auth.uid())
  )
);
