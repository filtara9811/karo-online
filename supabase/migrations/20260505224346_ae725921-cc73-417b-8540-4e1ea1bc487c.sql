
-- 1. payment_gateways: add purpose + priority
ALTER TABLE public.payment_gateways
  ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'both',
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 100;

ALTER TABLE public.payment_gateways
  ADD CONSTRAINT payment_gateways_purpose_check
  CHECK (purpose IN ('wallet_recharge','coin_purchase','both'));

-- 2. logistics_gateways
CREATE TABLE public.logistics_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL UNIQUE,
  display_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  is_test_mode boolean NOT NULL DEFAULT true,
  public_key text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  supports_hyperlocal boolean NOT NULL DEFAULT false,
  supports_intercity boolean NOT NULL DEFAULT true,
  supports_international boolean NOT NULL DEFAULT false,
  priority integer NOT NULL DEFAULT 100,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.logistics_gateways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view logistics gateways" ON public.logistics_gateways
  FOR SELECT TO authenticated USING (is_admin_user(auth.uid()));
CREATE POLICY "Super admins insert logistics gateways" ON public.logistics_gateways
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admins update logistics gateways" ON public.logistics_gateways
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admins delete logistics gateways" ON public.logistics_gateways
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_logistics_gateways_updated_at
  BEFORE UPDATE ON public.logistics_gateways
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.logistics_gateways
  (provider, display_name, supports_hyperlocal, supports_intercity, supports_international, priority)
VALUES
  ('shiprocket', 'Shiprocket', false, true, true, 10),
  ('porter', 'Porter', true, false, false, 20),
  ('delhivery', 'Delhivery', false, true, false, 30);

-- 3. coin_pricing_config (single-row)
CREATE TABLE public.coin_pricing_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coin_rate_inr numeric(10,2) NOT NULL DEFAULT 20,
  min_purchase_coins integer NOT NULL DEFAULT 50,
  max_purchase_coins integer NOT NULL DEFAULT 5000,
  gst_percent numeric(5,2) NOT NULL DEFAULT 18,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.coin_pricing_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone view coin pricing" ON public.coin_pricing_config
  FOR SELECT USING (true);
CREATE POLICY "Admins update coin pricing" ON public.coin_pricing_config
  FOR UPDATE TO authenticated USING (is_admin_user(auth.uid()));
CREATE POLICY "Super admins insert coin pricing" ON public.coin_pricing_config
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admins delete coin pricing" ON public.coin_pricing_config
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_coin_pricing_config_updated_at
  BEFORE UPDATE ON public.coin_pricing_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.coin_pricing_config (coin_rate_inr, min_purchase_coins, max_purchase_coins, gst_percent)
VALUES (20, 50, 5000, 18);

-- 4. coin_packs
CREATE TABLE public.coin_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_name text NOT NULL,
  coins integer NOT NULL,
  price_inr numeric(10,2) NOT NULL,
  bonus_coins integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coin_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone view active coin packs" ON public.coin_packs
  FOR SELECT USING (is_active = true OR is_admin_user(auth.uid()));
CREATE POLICY "Admins insert coin packs" ON public.coin_packs
  FOR INSERT TO authenticated WITH CHECK (is_admin_user(auth.uid()));
CREATE POLICY "Admins update coin packs" ON public.coin_packs
  FOR UPDATE TO authenticated USING (is_admin_user(auth.uid()));
CREATE POLICY "Admins delete coin packs" ON public.coin_packs
  FOR DELETE TO authenticated USING (is_admin_user(auth.uid()));

CREATE TRIGGER update_coin_packs_updated_at
  BEFORE UPDATE ON public.coin_packs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.coin_packs (pack_name, coins, price_inr, bonus_coins, sort_order) VALUES
  ('Starter', 50, 1000, 0, 10),
  ('Popular', 100, 2000, 10, 20),
  ('Pro', 250, 5000, 35, 30),
  ('Elite', 500, 10000, 100, 40);

-- 5. wallet_recharge_packs
CREATE TABLE public.wallet_recharge_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  amount_inr numeric(10,2) NOT NULL,
  bonus_inr numeric(10,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_recharge_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone view active wallet packs" ON public.wallet_recharge_packs
  FOR SELECT USING (is_active = true OR is_admin_user(auth.uid()));
CREATE POLICY "Admins insert wallet packs" ON public.wallet_recharge_packs
  FOR INSERT TO authenticated WITH CHECK (is_admin_user(auth.uid()));
CREATE POLICY "Admins update wallet packs" ON public.wallet_recharge_packs
  FOR UPDATE TO authenticated USING (is_admin_user(auth.uid()));
CREATE POLICY "Admins delete wallet packs" ON public.wallet_recharge_packs
  FOR DELETE TO authenticated USING (is_admin_user(auth.uid()));

CREATE TRIGGER update_wallet_recharge_packs_updated_at
  BEFORE UPDATE ON public.wallet_recharge_packs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.wallet_recharge_packs (label, amount_inr, bonus_inr, sort_order) VALUES
  ('Quick ₹500', 500, 0, 10),
  ('Standard ₹1,000', 1000, 25, 20),
  ('Power ₹2,000', 2000, 100, 30),
  ('Mega ₹5,000', 5000, 350, 40);
