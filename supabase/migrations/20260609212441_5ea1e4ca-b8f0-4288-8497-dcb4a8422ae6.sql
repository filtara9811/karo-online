CREATE TABLE public.web_virtual_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.web_virtual_devices TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.web_virtual_devices TO authenticated;
GRANT ALL ON public.web_virtual_devices TO service_role;
ALTER TABLE public.web_virtual_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read active devices" ON public.web_virtual_devices FOR SELECT USING (is_active = true OR is_admin_user(auth.uid()));
CREATE POLICY "admin all devices" ON public.web_virtual_devices FOR ALL USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));
CREATE TRIGGER trg_web_virtual_devices_updated BEFORE UPDATE ON public.web_virtual_devices FOR EACH ROW EXECUTE FUNCTION public.web_set_updated_at();