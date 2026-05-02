-- Legal Pages CMS
CREATE TABLE public.legal_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  hero_image_url text,
  video_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.legal_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active legal pages"
  ON public.legal_pages FOR SELECT
  USING (is_active = true OR is_admin_user(auth.uid()));

CREATE POLICY "Admins insert legal pages"
  ON public.legal_pages FOR INSERT TO authenticated
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "Admins update legal pages"
  ON public.legal_pages FOR UPDATE TO authenticated
  USING (is_admin_user(auth.uid()));

CREATE POLICY "Admins delete legal pages"
  ON public.legal_pages FOR DELETE TO authenticated
  USING (is_admin_user(auth.uid()));

CREATE TRIGGER update_legal_pages_updated_at
  BEFORE UPDATE ON public.legal_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- App settings (key/value)
CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view app settings"
  ON public.app_settings FOR SELECT USING (true);

CREATE POLICY "Admins insert app settings"
  ON public.app_settings FOR INSERT TO authenticated
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "Admins update app settings"
  ON public.app_settings FOR UPDATE TO authenticated
  USING (is_admin_user(auth.uid()));

CREATE POLICY "Admins delete app settings"
  ON public.app_settings FOR DELETE TO authenticated
  USING (is_admin_user(auth.uid()));

-- Seed default legal pages
INSERT INTO public.legal_pages (slug, title, body, sort_order) VALUES
  ('privacy', 'Privacy Policy', '<h2>Privacy Policy</h2><p>Update this content from the Admin Panel.</p>', 1),
  ('terms', 'Terms & Conditions', '<h2>Terms & Conditions</h2><p>Update this content from the Admin Panel.</p>', 2),
  ('refund', 'Refund Policy', '<h2>Refund Policy</h2><p>Update this content from the Admin Panel.</p>', 3);

-- Seed default social links
INSERT INTO public.app_settings (key, value) VALUES
  ('social_links', '{"facebook":"","instagram":"","twitter":"","telegram":"","youtube":"","linkedin":"","whatsapp":""}'::jsonb);