
CREATE TABLE IF NOT EXISTS public.cashfree_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  app_id TEXT,
  secret_key TEXT,
  assigned_use TEXT NOT NULL DEFAULT 'none',
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_test_mode BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 100,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cashfree_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view cashfree_services" ON public.cashfree_services;
DROP POLICY IF EXISTS "Admins can insert cashfree_services" ON public.cashfree_services;
DROP POLICY IF EXISTS "Admins can update cashfree_services" ON public.cashfree_services;
DROP POLICY IF EXISTS "Admins can delete cashfree_services" ON public.cashfree_services;

CREATE POLICY "Admins can view cashfree_services" ON public.cashfree_services FOR SELECT USING (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can insert cashfree_services" ON public.cashfree_services FOR INSERT WITH CHECK (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can update cashfree_services" ON public.cashfree_services FOR UPDATE USING (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can delete cashfree_services" ON public.cashfree_services FOR DELETE USING (public.is_admin_user(auth.uid()));

DROP TRIGGER IF EXISTS trg_cashfree_services_updated ON public.cashfree_services;
CREATE TRIGGER trg_cashfree_services_updated
  BEFORE UPDATE ON public.cashfree_services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.cashfree_services (service_key, display_name, description, assigned_use, priority) VALUES
  ('payment_gateway', 'Payment Gateway', 'Domestic + international payment collection', 'customer_payment', 10),
  ('payment_links', 'Payment Links', 'Share payment links via SMS/WhatsApp', 'none', 20),
  ('payment_forms', 'Payment Forms', 'No-code payment collection forms', 'none', 30),
  ('subscriptions', 'Subscriptions', 'Recurring billing via eNACH/UPI/Card', 'vendor_subscription', 40),
  ('payouts', 'Payouts', 'Send money to bank/UPI/card/wallet', 'vendor_payout', 50),
  ('cashgram', 'Cashgram', 'Payout links to customers', 'none', 60),
  ('one_click_checkout', 'One Click Checkout', 'Inbuilt OTP login + prefilled checkout', 'none', 70),
  ('bbps_biller', 'BBPS Biller', 'Bill collection via BBPS', 'none', 80),
  ('global_collections', 'Global Collections', 'International wire transfers', 'none', 90),
  ('international_pg', 'International Payment Gateway', '100+ currencies', 'none', 100),
  ('softpos', 'Offline Payments (SoftPOS)', 'Static QR / Dynamic QR / Tap n Pay', 'none', 110),
  ('flowwise', 'FlowWise', 'Smart routing across multiple gateways', 'none', 120),
  ('cross_border', 'Cross Border', 'International payment options', 'none', 130)
ON CONFLICT (service_key) DO NOTHING;
