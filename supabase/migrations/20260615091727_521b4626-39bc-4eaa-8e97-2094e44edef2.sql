
-- Feedback reports: prevent spoofing user_id
DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.feedback_reports;
CREATE POLICY "Anyone can submit feedback"
  ON public.feedback_reports
  FOR INSERT
  WITH CHECK (
    (auth.uid() IS NULL AND user_id IS NULL)
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
  );

-- Lead messages: respect customer-approved vendor
DROP POLICY IF EXISTS "Lead participants view messages" ON public.lead_messages;
CREATE POLICY "Lead participants view messages"
  ON public.lead_messages
  FOR SELECT
  USING (
    is_admin_user(auth.uid())
    OR auth.uid() = sender_id
    OR auth.uid() = recipient_id
    OR EXISTS (
      SELECT 1 FROM leads l
      WHERE l.id = lead_messages.lead_id
        AND (
          l.customer_id = auth.uid()
          OR (
            auth.uid() = ANY (l.accepted_vendor_ids)
            AND (l.customer_approved_vendor_id IS NULL OR l.customer_approved_vendor_id = auth.uid())
          )
        )
    )
  );

-- Storage: chat-media access also gated by approval
DROP POLICY IF EXISTS "chat-media participants read" ON storage.objects;
CREATE POLICY "chat-media participants read"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'chat-media'
    AND auth.uid() IS NOT NULL
    AND (
      is_admin_user(auth.uid())
      OR EXISTS (
        SELECT 1 FROM leads l
        WHERE (l.id)::text = (storage.foldername(objects.name))[1]
          AND (
            l.customer_id = auth.uid()
            OR (
              (auth.uid() = ANY (COALESCE(l.accepted_vendor_ids, ARRAY[]::uuid[])) OR auth.uid() = l.accepted_vendor_id)
              AND (l.customer_approved_vendor_id IS NULL OR l.customer_approved_vendor_id = auth.uid())
            )
          )
      )
    )
  );

DROP POLICY IF EXISTS "chat-media participants insert" ON storage.objects;
CREATE POLICY "chat-media participants insert"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-media'
    AND auth.uid() IS NOT NULL
    AND (
      is_admin_user(auth.uid())
      OR EXISTS (
        SELECT 1 FROM leads l
        WHERE (l.id)::text = (storage.foldername(objects.name))[1]
          AND (
            l.customer_id = auth.uid()
            OR (
              (auth.uid() = ANY (COALESCE(l.accepted_vendor_ids, ARRAY[]::uuid[])) OR auth.uid() = l.accepted_vendor_id)
              AND (l.customer_approved_vendor_id IS NULL OR l.customer_approved_vendor_id = auth.uid())
            )
          )
      )
    )
  );

DROP POLICY IF EXISTS "chat-media participants update" ON storage.objects;
CREATE POLICY "chat-media participants update"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'chat-media'
    AND auth.uid() IS NOT NULL
    AND (
      is_admin_user(auth.uid())
      OR (
        owner = auth.uid()
        AND EXISTS (
          SELECT 1 FROM leads l
          WHERE (l.id)::text = (storage.foldername(objects.name))[1]
            AND (
              l.customer_id = auth.uid()
              OR (
                (auth.uid() = ANY (COALESCE(l.accepted_vendor_ids, ARRAY[]::uuid[])) OR auth.uid() = l.accepted_vendor_id)
                AND (l.customer_approved_vendor_id IS NULL OR l.customer_approved_vendor_id = auth.uid())
              )
            )
        )
      )
    )
  );

DROP POLICY IF EXISTS "chat-media participants delete" ON storage.objects;
CREATE POLICY "chat-media participants delete"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'chat-media'
    AND auth.uid() IS NOT NULL
    AND (
      is_admin_user(auth.uid())
      OR (
        owner = auth.uid()
        AND EXISTS (
          SELECT 1 FROM leads l
          WHERE (l.id)::text = (storage.foldername(objects.name))[1]
            AND (
              l.customer_id = auth.uid()
              OR (
                (auth.uid() = ANY (COALESCE(l.accepted_vendor_ids, ARRAY[]::uuid[])) OR auth.uid() = l.accepted_vendor_id)
                AND (l.customer_approved_vendor_id IS NULL OR l.customer_approved_vendor_id = auth.uid())
              )
            )
        )
      )
    )
  );
