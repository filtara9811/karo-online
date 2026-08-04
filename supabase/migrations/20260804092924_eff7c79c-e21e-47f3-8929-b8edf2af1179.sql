CREATE TABLE public.qr_landing_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  preset text NOT NULL DEFAULT 'classic',
  accent_color text NOT NULL DEFAULT '#f59e0b',
  bg_from text NOT NULL DEFAULT '#fffbeb',
  bg_to text NOT NULL DEFAULT '#ffffff',
  is_premium boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.qr_landing_themes TO anon;
GRANT SELECT ON public.qr_landing_themes TO authenticated;
GRANT ALL ON public.qr_landing_themes TO service_role;

ALTER TABLE public.qr_landing_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active themes"
ON public.qr_landing_themes FOR SELECT TO anon, authenticated
USING (is_active = true);

CREATE POLICY "Admins manage themes"
ON public.qr_landing_themes FOR ALL TO authenticated
USING (public._is_admin()) WITH CHECK (public._is_admin());

CREATE TRIGGER update_qr_landing_themes_updated_at
BEFORE UPDATE ON public.qr_landing_themes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.qr_landing_themes (key, name, description, preset, accent_color, bg_from, bg_to, is_premium, sort_order) VALUES
('classic_amber', 'Classic Amber', 'Simple, clean shop page', 'classic', '#f59e0b', '#fffbeb', '#ffffff', false, 1),
('minimal_white', 'Minimal White', 'Plain white, fast loading', 'minimal', '#0f172a', '#ffffff', '#f8fafc', false, 2),
('fresh_green', 'Fresh Green', 'Bright and friendly', 'fresh', '#059669', '#ecfdf5', '#ffffff', false, 3),
('royal_dark', 'Royal Dark', 'Premium dark glass look', 'royal', '#a855f7', '#0b1020', '#1e1b4b', true, 4),
('neon_gradient', 'Neon Gradient', 'Bold gradient hero for brands', 'neon', '#ec4899', '#1e1b4b', '#0f172a', true, 5);

ALTER TABLE public.merchant_link_settings
  ADD COLUMN IF NOT EXISTS landing_theme_key text NOT NULL DEFAULT 'classic_amber',
  ADD COLUMN IF NOT EXISTS landing_theme_accent text;