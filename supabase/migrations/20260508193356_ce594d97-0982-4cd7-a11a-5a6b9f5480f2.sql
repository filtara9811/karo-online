CREATE TABLE IF NOT EXISTS public.integration_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  provider_key text NOT NULL,
  display_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  is_test_mode boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category, provider_key)
);

ALTER TABLE public.integration_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read integration_providers"
  ON public.integration_providers FOR SELECT
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins insert integration_providers"
  ON public.integration_providers FOR INSERT
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins update integration_providers"
  ON public.integration_providers FOR UPDATE
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins delete integration_providers"
  ON public.integration_providers FOR DELETE
  USING (public.is_admin_user(auth.uid()));

CREATE TRIGGER integration_providers_updated_at
  BEFORE UPDATE ON public.integration_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ensure only one active per category
CREATE OR REPLACE FUNCTION public.enforce_single_active_integration()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE public.integration_providers
       SET is_active = false
     WHERE category = NEW.category AND id <> NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER integration_providers_single_active
  BEFORE INSERT OR UPDATE ON public.integration_providers
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_active_integration();

ALTER PUBLICATION supabase_realtime ADD TABLE public.integration_providers;

-- Seed Maps providers (demo/mock mode)
INSERT INTO public.integration_providers (category, provider_key, display_name, is_active, is_test_mode, config, notes) VALUES
  ('maps', 'osm', 'OpenStreetMap (Free)', true, true, '{"tile_url":"https://tile.openstreetmap.org/{z}/{x}/{y}.png"}'::jsonb, 'Default fallback — no API key required'),
  ('maps', 'google', 'Google Maps Platform', false, true, '{"api_key":""}'::jsonb, 'Add real key in Secrets when going live'),
  ('maps', 'mappls', 'Mappls (India Maps)', false, true, '{"client_id":"","client_secret":"","rest_api_key":""}'::jsonb, 'Indian-region optimised provider')
ON CONFLICT (category, provider_key) DO NOTHING;