
-- Lead messages table for customer ↔ vendor real-time chat per lead
CREATE TABLE IF NOT EXISTS public.lead_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('customer','vendor')),
  recipient_id uuid,
  body text,
  image_url text,
  attachment jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_messages_lead ON public.lead_messages(lead_id, created_at);
CREATE INDEX IF NOT EXISTS idx_lead_messages_recipient ON public.lead_messages(recipient_id);

ALTER TABLE public.lead_messages ENABLE ROW LEVEL SECURITY;

-- View: customer who owns the lead, accepted vendor, or admin
CREATE POLICY "Lead participants view messages"
ON public.lead_messages FOR SELECT TO authenticated
USING (
  is_admin_user(auth.uid())
  OR auth.uid() = sender_id
  OR auth.uid() = recipient_id
  OR EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_messages.lead_id
      AND (l.customer_id = auth.uid() OR auth.uid() = ANY(l.accepted_vendor_ids))
  )
);

-- Insert: must be sender, and must be customer-owner OR an accepted vendor on the lead
CREATE POLICY "Lead participants send messages"
ON public.lead_messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_messages.lead_id
      AND (
        (sender_role = 'customer' AND l.customer_id = auth.uid())
        OR (sender_role = 'vendor' AND auth.uid() = ANY(l.accepted_vendor_ids))
      )
  )
);

-- Update (read receipts) by recipient
CREATE POLICY "Recipient marks read"
ON public.lead_messages FOR UPDATE TO authenticated
USING (auth.uid() = recipient_id OR is_admin_user(auth.uid()));

CREATE POLICY "Admins delete messages"
ON public.lead_messages FOR DELETE TO authenticated
USING (is_admin_user(auth.uid()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_messages;
ALTER TABLE public.lead_messages REPLICA IDENTITY FULL;
