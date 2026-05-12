CREATE TABLE IF NOT EXISTS public.customer_form_toggles (
  field_key text PRIMARY KEY,
  label text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_form_toggles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone can read customer toggles" ON public.customer_form_toggles;
CREATE POLICY "anyone can read customer toggles"
  ON public.customer_form_toggles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "admins manage customer toggles" ON public.customer_form_toggles;
CREATE POLICY "admins manage customer toggles"
  ON public.customer_form_toggles FOR ALL
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

INSERT INTO public.customer_form_toggles (field_key, label, enabled, sort_order) VALUES
  ('name',     'Full Name',     true, 10),
  ('gender',   'Gender',        true, 20),
  ('email',    'Email Address', true, 30),
  ('address',  'Home Address',  true, 40),
  ('manager',  'Manager Pick',  true, 50),
  ('referral', 'Referral Code', true, 60)
ON CONFLICT (field_key) DO NOTHING;