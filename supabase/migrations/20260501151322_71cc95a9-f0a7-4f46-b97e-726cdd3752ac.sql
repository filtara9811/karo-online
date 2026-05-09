
-- Customers table to mirror auth.users with profile details from registration flow
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  name TEXT,
  gender TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  avatar_url TEXT,
  signup_method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_user_id ON public.customers(user_id);
CREATE INDEX idx_customers_created_at ON public.customers(created_at DESC);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Users can view & update their own profile
CREATE POLICY "Users view own customer profile"
  ON public.customers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_user(auth.uid()));

CREATE POLICY "Users insert own customer profile"
  ON public.customers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own customer profile"
  ON public.customers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_user(auth.uid()));

CREATE POLICY "Admins delete customers"
  ON public.customers FOR DELETE
  TO authenticated
  USING (public.is_admin_user(auth.uid()));

-- updated_at trigger
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create customer row on signup (best-effort with email/avatar from OAuth metadata)
CREATE OR REPLACE FUNCTION public.handle_new_customer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.customers (user_id, email, name, avatar_url, phone, signup_method)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.phone,
    COALESCE(NEW.raw_app_meta_data->>'provider', 'email')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_customer
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_customer();
