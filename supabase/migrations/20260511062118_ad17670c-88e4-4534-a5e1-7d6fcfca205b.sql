
-- Form Builder ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.form_schemas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_type text NOT NULL CHECK (form_type IN ('customer','vendor','staff')),
  version int NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  schema jsonb NOT NULL DEFAULT '{"steps":[]}'::jsonb,
  payment_after_step int,
  payment_amount_inr numeric,
  payment_purpose text,
  notes text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS form_schemas_active_per_type
  ON public.form_schemas(form_type) WHERE is_active = true;

ALTER TABLE public.form_schemas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fs_admin_all" ON public.form_schemas FOR ALL TO authenticated
  USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));
CREATE POLICY "fs_public_read_active" ON public.form_schemas FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE OR REPLACE FUNCTION public.tg_form_schemas_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS form_schemas_touch ON public.form_schemas;
CREATE TRIGGER form_schemas_touch BEFORE UPDATE ON public.form_schemas
  FOR EACH ROW EXECUTE FUNCTION public.tg_form_schemas_touch();

-- Seed default schemas (idempotent) --------------------------------------
INSERT INTO public.form_schemas (form_type, schema)
SELECT 'customer', '{"steps":[{"title":"Basic","fields":[
  {"key":"name","label":"Full Name","type":"text","required":true},
  {"key":"phone","label":"Mobile Number","type":"phone","required":true},
  {"key":"email","label":"Email","type":"email","required":false},
  {"key":"gender","label":"Gender","type":"select","options":["Male","Female","Other"],"required":false},
  {"key":"address","label":"Address","type":"textarea","required":false}
]}]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.form_schemas WHERE form_type='customer');

INSERT INTO public.form_schemas (form_type, schema, payment_after_step, payment_amount_inr, payment_purpose)
SELECT 'vendor', '{"steps":[
  {"title":"Basic","fields":[
    {"key":"name","label":"Owner Name","type":"text","required":true},
    {"key":"phone","label":"Mobile","type":"phone","required":true},
    {"key":"shop_name","label":"Shop / Business Name","type":"text","required":true},
    {"key":"category","label":"Service Category","type":"select","required":true}
  ]},
  {"title":"KYC","fields":[
    {"key":"aadhaar","label":"Aadhaar Number","type":"text","required":false},
    {"key":"pan","label":"PAN","type":"text","required":false},
    {"key":"gst","label":"GST Number","type":"text","required":false},
    {"key":"address","label":"Shop Address","type":"textarea","required":true},
    {"key":"shop_photo","label":"Shop Photo","type":"image","required":false}
  ]}
]}'::jsonb, 2, 99, 'vendor_subscription'
WHERE NOT EXISTS (SELECT 1 FROM public.form_schemas WHERE form_type='vendor');

INSERT INTO public.form_schemas (form_type, schema)
SELECT 'staff', '{"steps":[{"title":"Basic","fields":[
  {"key":"name","label":"Full Name","type":"text","required":true},
  {"key":"phone","label":"Mobile","type":"phone","required":true},
  {"key":"role","label":"Role","type":"select","options":["Support","Operations","Field","Manager"],"required":true},
  {"key":"id_proof","label":"ID Proof","type":"image","required":false}
]}]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.form_schemas WHERE form_type='staff');

-- Branding Studio --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.theme_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('customer','vendor','admin')),
  is_active boolean NOT NULL DEFAULT true,
  preset_name text,
  tokens jsonb NOT NULL DEFAULT '{}'::jsonb,
  fonts jsonb NOT NULL DEFAULT '{}'::jsonb,
  icons_pack text NOT NULL DEFAULT 'lucide',
  assets jsonb NOT NULL DEFAULT '{}'::jsonb,
  radius_scale numeric NOT NULL DEFAULT 1,
  shadow_intensity numeric NOT NULL DEFAULT 1,
  animation_speed numeric NOT NULL DEFAULT 1,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS theme_settings_active_per_scope
  ON public.theme_settings(scope) WHERE is_active = true;

ALTER TABLE public.theme_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ts_admin_all" ON public.theme_settings FOR ALL TO authenticated
  USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));
CREATE POLICY "ts_public_read_active" ON public.theme_settings FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE OR REPLACE FUNCTION public.tg_theme_settings_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS theme_settings_touch ON public.theme_settings;
CREATE TRIGGER theme_settings_touch BEFORE UPDATE ON public.theme_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_theme_settings_touch();

INSERT INTO public.theme_settings (scope, preset_name, tokens, fonts)
SELECT 'customer', 'Royal Gold',
  '{"primary":"#D4AF37","background":"#FFFFFF","foreground":"#1a1208","accent":"#B8860B","success":"#16a34a","danger":"#dc2626"}'::jsonb,
  '{"display":"Cormorant Garamond","body":"Inter"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.theme_settings WHERE scope='customer');

INSERT INTO public.theme_settings (scope, preset_name, tokens, fonts)
SELECT 'vendor', 'Sapphire Silver',
  '{"primary":"#2563EB","background":"#FFFFFF","foreground":"#0f172a","accent":"#6B7280","success":"#16a34a","danger":"#dc2626"}'::jsonb,
  '{"display":"Playfair Display","body":"Inter"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.theme_settings WHERE scope='vendor');

INSERT INTO public.theme_settings (scope, preset_name, tokens, fonts)
SELECT 'admin', 'Midnight Gold',
  '{"primary":"#D4AF37","background":"#0f0c05","foreground":"#fff8dc","accent":"#8b6508"}'::jsonb,
  '{"display":"Cormorant Garamond","body":"Inter"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.theme_settings WHERE scope='admin');
