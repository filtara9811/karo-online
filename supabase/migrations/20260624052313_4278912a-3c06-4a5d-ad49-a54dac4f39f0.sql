
-- ============ 1. voice_providers ============
CREATE TABLE public.voice_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'dialnexa',
  display_name text NOT NULL,
  api_base_url text,
  api_key text,
  agent_id text,
  caller_id text,
  webhook_secret text,
  is_active boolean NOT NULL DEFAULT false,
  is_test_mode boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 100,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_providers TO authenticated;
GRANT ALL ON public.voice_providers TO service_role;
ALTER TABLE public.voice_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage voice providers" ON public.voice_providers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ 2. voice_call_logs ============
CREATE TABLE public.voice_call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES public.voice_providers(id) ON DELETE SET NULL,
  external_call_id text,
  to_phone text,
  status text NOT NULL DEFAULT 'queued',
  outcome text,
  rejection_reason text,
  transcript jsonb,
  duration_sec integer,
  started_at timestamptz,
  ended_at timestamptz,
  error_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_voice_call_logs_lead ON public.voice_call_logs(lead_id);
CREATE INDEX idx_voice_call_logs_vendor ON public.voice_call_logs(vendor_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_call_logs TO authenticated;
GRANT ALL ON public.voice_call_logs TO service_role;
ALTER TABLE public.voice_call_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read all voice logs" ON public.voice_call_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Vendors read own voice logs" ON public.voice_call_logs
  FOR SELECT TO authenticated
  USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));

-- ============ 3. whatsapp_message_logs ============
CREATE TABLE public.whatsapp_message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES public.whatsapp_providers(id) ON DELETE SET NULL,
  wa_message_id text,
  to_phone text,
  template_name text,
  status text NOT NULL DEFAULT 'queued',
  button_clicked text,
  clicked_at timestamptz,
  error_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_wa_logs_lead ON public.whatsapp_message_logs(lead_id);
CREATE INDEX idx_wa_logs_vendor ON public.whatsapp_message_logs(vendor_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_message_logs TO authenticated;
GRANT ALL ON public.whatsapp_message_logs TO service_role;
ALTER TABLE public.whatsapp_message_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read all wa logs" ON public.whatsapp_message_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Vendors read own wa logs" ON public.whatsapp_message_logs
  FOR SELECT TO authenticated
  USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));

-- ============ 4. group_communication_settings ============
CREATE TABLE public.group_communication_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL UNIQUE REFERENCES public.catalog_groups(id) ON DELETE CASCADE,
  voice_agent_enabled boolean NOT NULL DEFAULT false,
  whatsapp_enabled boolean NOT NULL DEFAULT true,
  push_enabled boolean NOT NULL DEFAULT true,
  voice_script_override text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_communication_settings TO authenticated;
GRANT ALL ON public.group_communication_settings TO service_role;
ALTER TABLE public.group_communication_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authed can read group comm settings" ON public.group_communication_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage group comm settings" ON public.group_communication_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ 5. updated_at triggers ============
CREATE TRIGGER trg_voice_providers_updated BEFORE UPDATE ON public.voice_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_voice_call_logs_updated BEFORE UPDATE ON public.voice_call_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_wa_logs_updated BEFORE UPDATE ON public.whatsapp_message_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_group_comm_updated BEFORE UPDATE ON public.group_communication_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
