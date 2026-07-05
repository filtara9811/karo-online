-- Admin-configurable subscription plan for vendor onboarding
CREATE TABLE IF NOT EXISTS public.vendor_subscription_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name text NOT NULL DEFAULT 'Premium Plan',
  headline text NOT NULL DEFAULT 'Grow Your Business, Get More Leads',
  sub_headline text NOT NULL DEFAULT 'Everything you need to get more leads, orders and grow your business.',
  price_paise integer NOT NULL DEFAULT 59900,
  original_price_paise integer NOT NULL DEFAULT 100000,
  trial_price_paise integer NOT NULL DEFAULT 100,
  trial_days integer NOT NULL DEFAULT 15,
  trial_enabled boolean NOT NULL DEFAULT false,
  auto_deduct_after_trial boolean NOT NULL DEFAULT false,
  features jsonb NOT NULL DEFAULT '["Unlimited Leads","All Category Access","Priority Support","Verified Profile","Business Growth","Secure Payments"]'::jsonb,
  payment_gateway text NOT NULL DEFAULT 'cashfree',
  upi_id text,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.vendor_subscription_settings TO anon, authenticated;
GRANT ALL ON public.vendor_subscription_settings TO service_role;

ALTER TABLE public.vendor_subscription_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active subscription settings"
  ON public.vendor_subscription_settings FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins manage subscription settings"
  ON public.vendor_subscription_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed one default row
INSERT INTO public.vendor_subscription_settings (id) VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

-- Track onboarding progress on vendors
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS onboarding_step integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_order_id text,
  ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz;
