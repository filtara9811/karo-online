
-- Vendor wallets (one row per vendor)
CREATE TABLE public.vendor_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL UNIQUE,
  service_balance_paise bigint NOT NULL DEFAULT 0,
  leadx_coins integer NOT NULL DEFAULT 0,
  lifetime_recharged_paise bigint NOT NULL DEFAULT 0,
  lifetime_spent_paise bigint NOT NULL DEFAULT 0,
  lifetime_coins_purchased integer NOT NULL DEFAULT 0,
  lifetime_coins_used integer NOT NULL DEFAULT 0,
  leads_total integer NOT NULL DEFAULT 0,
  leads_used integer NOT NULL DEFAULT 0,
  auto_topup_enabled boolean NOT NULL DEFAULT false,
  low_balance_threshold_paise bigint NOT NULL DEFAULT 10000,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_vendor_wallets_vendor ON public.vendor_wallets(vendor_id);

ALTER TABLE public.vendor_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors view own wallet" ON public.vendor_wallets
  FOR SELECT TO authenticated
  USING (auth.uid() = vendor_id OR is_admin_user(auth.uid()));
CREATE POLICY "Admins insert wallets" ON public.vendor_wallets
  FOR INSERT TO authenticated
  WITH CHECK (is_admin_user(auth.uid()) OR auth.uid() = vendor_id);
CREATE POLICY "Admins update wallets" ON public.vendor_wallets
  FOR UPDATE TO authenticated
  USING (is_admin_user(auth.uid()));
CREATE POLICY "Admins delete wallets" ON public.vendor_wallets
  FOR DELETE TO authenticated
  USING (is_admin_user(auth.uid()));

CREATE TRIGGER trg_vendor_wallets_updated
  BEFORE UPDATE ON public.vendor_wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Transactions
CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL,
  wallet_kind text NOT NULL CHECK (wallet_kind IN ('service','coin')),
  txn_type text NOT NULL CHECK (txn_type IN ('recharge','coin_purchase','lead_unlock','shipment','refund','bonus','adjustment','withdrawal')),
  direction text NOT NULL CHECK (direction IN ('credit','debit')),
  amount_paise bigint NOT NULL DEFAULT 0,
  coins integer NOT NULL DEFAULT 0,
  balance_after_paise bigint,
  coin_balance_after integer,
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('pending','success','failed','reversed')),
  reference_id text,
  gateway text,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_wallet_txn_vendor_time ON public.wallet_transactions(vendor_id, created_at DESC);
CREATE INDEX idx_wallet_txn_type ON public.wallet_transactions(txn_type);
CREATE INDEX idx_wallet_txn_search ON public.wallet_transactions USING gin (to_tsvector('simple', coalesce(description,'') || ' ' || coalesce(reference_id,'')));

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors view own txns" ON public.wallet_transactions
  FOR SELECT TO authenticated
  USING (auth.uid() = vendor_id OR is_admin_user(auth.uid()));
CREATE POLICY "Admins insert txns" ON public.wallet_transactions
  FOR INSERT TO authenticated
  WITH CHECK (is_admin_user(auth.uid()) OR auth.uid() = vendor_id);
CREATE POLICY "Admins update txns" ON public.wallet_transactions
  FOR UPDATE TO authenticated
  USING (is_admin_user(auth.uid()));
CREATE POLICY "Admins delete txns" ON public.wallet_transactions
  FOR DELETE TO authenticated
  USING (is_admin_user(auth.uid()));

-- LeadX rate history (for live chart)
CREATE TABLE public.leadx_rate_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_inr numeric NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_leadx_rate_time ON public.leadx_rate_history(recorded_at DESC);

ALTER TABLE public.leadx_rate_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view rate history" ON public.leadx_rate_history
  FOR SELECT TO public USING (true);
CREATE POLICY "Admins insert rate history" ON public.leadx_rate_history
  FOR INSERT TO authenticated WITH CHECK (is_admin_user(auth.uid()));
CREATE POLICY "Admins delete rate history" ON public.leadx_rate_history
  FOR DELETE TO authenticated USING (is_admin_user(auth.uid()));

-- Seed 30 days of rate history (around ₹20)
INSERT INTO public.leadx_rate_history (rate_inr, recorded_at)
SELECT 19 + random() * 2.5, now() - (interval '1 day' * g)
FROM generate_series(0, 29) AS g;
