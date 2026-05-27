CREATE TABLE public.test_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  otp_code text NOT NULL DEFAULT '1234',
  label text NOT NULL DEFAULT 'Reviewer',
  role text NOT NULL DEFAULT 'customer',
  email text,
  name text,
  enabled boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT test_accounts_phone_format CHECK (phone ~ '^[0-9]{10}$'),
  CONSTRAINT test_accounts_otp_format CHECK (otp_code ~ '^[0-9]{4,6}$'),
  CONSTRAINT test_accounts_role_check CHECK (role IN ('customer','vendor'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_accounts TO authenticated;
GRANT ALL ON public.test_accounts TO service_role;

ALTER TABLE public.test_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage test accounts"
ON public.test_accounts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_test_accounts_updated_at
BEFORE UPDATE ON public.test_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed with the two existing hardcoded reviewer accounts so behaviour is unchanged out of the box.
INSERT INTO public.test_accounts (phone, otp_code, label, role, email, name, enabled)
VALUES
  ('9999900000', '1234', 'Customer Reviewer', 'customer', 'reviewer@karoonline.in', 'Reviewer Customer', true),
  ('9999900001', '1234', 'Vendor Reviewer',   'vendor',   'vendor@karoonline.in',   'Reviewer Vendor',   true)
ON CONFLICT (phone) DO NOTHING;