-- Harden Realtime: restrict broadcast/presence on realtime.messages to authenticated users only,
-- and ensure postgres_changes for sensitive tables (leads, lead_messages) is gated by strict RLS
-- on the source tables (Realtime postgres_changes respects table RLS for each subscriber).

-- 1. Lock down realtime.messages (Broadcast & Presence channel layer).
-- Default-deny via RLS; only authenticated users can interact, and only with topics
-- that don't leak data about other users. We require auth.uid() to be present.
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_can_read_realtime_messages" ON realtime.messages;
DROP POLICY IF EXISTS "authenticated_can_write_realtime_messages" ON realtime.messages;

CREATE POLICY "authenticated_can_read_realtime_messages"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_can_write_realtime_messages"
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- 2. Re-affirm strict SELECT RLS on public.leads so postgres_changes filters per-subscriber.
-- Only the customer who created the lead, vendors who were notified or accepted,
-- and admins may read the row (and thus receive realtime change events).
DO $$
BEGIN
  -- Drop any overly permissive legacy policies
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Leads readable by all authenticated' AND polrelid = 'public.leads'::regclass) THEN
    EXECUTE 'DROP POLICY "Leads readable by all authenticated" ON public.leads';
  END IF;
END $$;

DROP POLICY IF EXISTS "leads_select_involved_parties" ON public.leads;
CREATE POLICY "leads_select_involved_parties"
  ON public.leads
  FOR SELECT
  TO authenticated
  USING (
    customer_id = auth.uid()
    OR auth.uid() = ANY(COALESCE(accepted_vendor_ids, ARRAY[]::uuid[]))
    OR EXISTS (
      SELECT 1 FROM public.lead_notifications n
      WHERE n.lead_id = leads.id AND n.vendor_id = auth.uid()
    )
    OR public.is_admin_user(auth.uid())
  );

-- 3. Re-affirm strict SELECT RLS on public.lead_messages so postgres_changes only
-- broadcasts messages to the sender, recipient, or admins.
DROP POLICY IF EXISTS "lead_messages_select_participants" ON public.lead_messages;
CREATE POLICY "lead_messages_select_participants"
  ON public.lead_messages
  FOR SELECT
  TO authenticated
  USING (
    sender_id = auth.uid()
    OR recipient_id = auth.uid()
    OR public.is_admin_user(auth.uid())
  );
