ALTER TABLE public.lead_messages
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS original_body text;

DROP POLICY IF EXISTS "Sender edits own messages" ON public.lead_messages;
CREATE POLICY "Sender edits own messages" ON public.lead_messages
  FOR UPDATE TO authenticated
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);
