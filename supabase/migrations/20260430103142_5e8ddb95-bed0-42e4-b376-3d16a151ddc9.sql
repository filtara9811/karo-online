-- Categories table (tree structure with parent_id)
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE INDEX idx_categories_parent ON public.categories(parent_id);
CREATE INDEX idx_categories_slug ON public.categories(slug);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Public can read active categories
CREATE POLICY "Anyone can view active categories"
  ON public.categories FOR SELECT
  USING (is_active = true OR public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can insert categories"
  ON public.categories FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can update categories"
  ON public.categories FOR UPDATE TO authenticated
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can delete categories"
  ON public.categories FOR DELETE TO authenticated
  USING (public.is_admin_user(auth.uid()));

-- Payment gateway configs (non-secret config; actual keys live in Supabase secrets)
CREATE TABLE public.payment_gateways (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL UNIQUE, -- 'razorpay' | 'stripe' | 'cashfree' etc
  display_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_test_mode BOOLEAN NOT NULL DEFAULT true,
  public_key TEXT, -- safe to store (e.g. razorpay key_id, stripe publishable)
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view payment gateways"
  ON public.payment_gateways FOR SELECT TO authenticated
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Super admins can insert payment gateways"
  ON public.payment_gateways FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update payment gateways"
  ON public.payment_gateways FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete payment gateways"
  ON public.payment_gateways FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Auto update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_gateways_updated_at
  BEFORE UPDATE ON public.payment_gateways
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default gateways (inactive, super admin will configure)
INSERT INTO public.payment_gateways (provider, display_name, is_active, is_test_mode)
VALUES
  ('razorpay', 'Razorpay', false, true),
  ('stripe', 'Stripe', false, true);