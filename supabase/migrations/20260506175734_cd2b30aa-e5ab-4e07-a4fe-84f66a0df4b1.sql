
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  customer_name text,
  customer_phone text,
  type_id uuid,
  root_category_id uuid,
  sub_category_id uuid NOT NULL,
  sub_category_name text NOT NULL,
  item_ids uuid[] NOT NULL DEFAULT '{}',
  item_names text[] NOT NULL DEFAULT '{}',
  note text,
  images text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'new',
  accepted_vendor_id uuid,
  accepted_at timestamptz,
  lat double precision,
  lng double precision,
  address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_sub ON public.leads(sub_category_id);
CREATE INDEX IF NOT EXISTS idx_leads_customer ON public.leads(customer_id);

CREATE TABLE IF NOT EXISTS public.lead_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL,
  sub_category_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lnotif_vendor ON public.lead_notifications(vendor_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lnotif_lead ON public.lead_notifications(lead_id);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers insert own leads" ON public.leads
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Leads visible to involved parties" ON public.leads
  FOR SELECT TO authenticated
  USING (auth.uid() = customer_id OR auth.uid() = accepted_vendor_id OR is_admin_user(auth.uid())
    OR EXISTS (SELECT 1 FROM public.lead_notifications n WHERE n.lead_id = leads.id AND n.vendor_id = auth.uid()));

CREATE POLICY "Customers update own leads" ON public.leads
  FOR UPDATE TO authenticated
  USING (auth.uid() = customer_id OR auth.uid() = accepted_vendor_id OR is_admin_user(auth.uid()));

CREATE POLICY "Admins delete leads" ON public.leads
  FOR DELETE TO authenticated USING (is_admin_user(auth.uid()));

CREATE POLICY "Insert notifications by lead owner" ON public.lead_notifications
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.customer_id = auth.uid())
    OR is_admin_user(auth.uid())
  );

CREATE POLICY "Vendors view own notifications" ON public.lead_notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = vendor_id OR is_admin_user(auth.uid())
    OR EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.customer_id = auth.uid()));

CREATE POLICY "Vendors update own notifications" ON public.lead_notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = vendor_id OR is_admin_user(auth.uid()));

CREATE POLICY "Admins delete notifications" ON public.lead_notifications
  FOR DELETE TO authenticated USING (is_admin_user(auth.uid()));

CREATE TRIGGER trg_leads_updated BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_notifications;
ALTER TABLE public.leads REPLICA IDENTITY FULL;
ALTER TABLE public.lead_notifications REPLICA IDENTITY FULL;

CREATE OR REPLACE FUNCTION public.accept_lead(_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _vendor uuid := auth.uid();
  _ok boolean;
  _lead jsonb;
BEGIN
  IF _vendor IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.lead_notifications WHERE lead_id = _lead_id AND vendor_id = _vendor) THEN
    RAISE EXCEPTION 'not notified for this lead';
  END IF;
  UPDATE public.leads
    SET status = 'accepted', accepted_vendor_id = _vendor, accepted_at = now(), updated_at = now()
    WHERE id = _lead_id AND status = 'new'
    RETURNING true INTO _ok;
  IF _ok IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_taken');
  END IF;
  UPDATE public.lead_notifications
    SET status = CASE WHEN vendor_id = _vendor THEN 'accepted' ELSE 'superseded' END,
        responded_at = now()
    WHERE lead_id = _lead_id;
  SELECT to_jsonb(l) INTO _lead FROM public.leads l WHERE l.id = _lead_id;
  RETURN jsonb_build_object('ok', true, 'lead', _lead);
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_lead(_lead_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.lead_notifications
    SET status = 'rejected', responded_at = now()
    WHERE lead_id = _lead_id AND vendor_id = auth.uid();
$$;
