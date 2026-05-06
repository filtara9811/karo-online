
-- 1. Add lead_cost_coins to categories
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS lead_cost_coins integer NOT NULL DEFAULT 0;

-- 2. Lead source multipliers (admin-controlled)
CREATE TABLE public.lead_source_multipliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key text NOT NULL UNIQUE,
  source_label text NOT NULL,
  multiplier numeric NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.lead_source_multipliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone view source multipliers" ON public.lead_source_multipliers FOR SELECT TO public USING (true);
CREATE POLICY "Admins insert source multipliers" ON public.lead_source_multipliers FOR INSERT TO authenticated WITH CHECK (is_admin_user(auth.uid()));
CREATE POLICY "Admins update source multipliers" ON public.lead_source_multipliers FOR UPDATE TO authenticated USING (is_admin_user(auth.uid()));
CREATE POLICY "Admins delete source multipliers" ON public.lead_source_multipliers FOR DELETE TO authenticated USING (is_admin_user(auth.uid()));

-- Seed default multipliers
INSERT INTO public.lead_source_multipliers (source_key, source_label, multiplier, sort_order) VALUES
  ('quick', 'Quick Service', 1, 10),
  ('whatsapp', 'WhatsApp', 1, 20),
  ('call', 'Voice Call', 1, 30),
  ('digital_inquiry', 'Digital Shop Inquiry', 0.3, 40),
  ('digital_order', 'Digital Shop Order', 0, 50);

-- 3. Coin transfers (P2P free transfer)
CREATE TABLE public.coin_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  coins integer NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coin_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors view own transfers" ON public.coin_transfers FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id OR is_admin_user(auth.uid()));
CREATE POLICY "Vendors insert transfers" ON public.coin_transfers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Admins delete transfers" ON public.coin_transfers FOR DELETE TO authenticated
  USING (is_admin_user(auth.uid()));

-- 4. Function: transfer coins between vendors
CREATE OR REPLACE FUNCTION public.transfer_coins(_receiver_id uuid, _coins integer, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sender uuid := auth.uid();
  _sender_bal integer;
  _receiver_bal integer;
BEGIN
  IF _sender IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'auth_required');
  END IF;
  IF _coins <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_amount');
  END IF;
  IF _sender = _receiver_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'self_transfer');
  END IF;

  -- Check sender balance
  SELECT leadx_coins INTO _sender_bal FROM public.vendor_wallets WHERE vendor_id = _sender FOR UPDATE;
  IF _sender_bal IS NULL OR _sender_bal < _coins THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'insufficient_coins', 'balance', COALESCE(_sender_bal, 0));
  END IF;

  -- Deduct from sender
  UPDATE public.vendor_wallets SET leadx_coins = leadx_coins - _coins, updated_at = now() WHERE vendor_id = _sender;

  -- Credit receiver (create wallet if missing)
  INSERT INTO public.vendor_wallets (vendor_id, leadx_coins) VALUES (_receiver_id, _coins)
    ON CONFLICT (vendor_id) DO UPDATE SET leadx_coins = vendor_wallets.leadx_coins + _coins, updated_at = now();

  SELECT leadx_coins INTO _receiver_bal FROM public.vendor_wallets WHERE vendor_id = _receiver_id;

  -- Record transfer
  INSERT INTO public.coin_transfers (sender_id, receiver_id, coins, note) VALUES (_sender, _receiver_id, _coins, _note);

  -- Transaction logs
  INSERT INTO public.wallet_transactions (vendor_id, wallet_kind, txn_type, direction, coins, status, description, coin_balance_after)
    VALUES (_sender, 'coin', 'p2p_transfer', 'debit', _coins, 'success', 'Coins sent to vendor', _sender_bal - _coins);
  INSERT INTO public.wallet_transactions (vendor_id, wallet_kind, txn_type, direction, coins, status, description, coin_balance_after)
    VALUES (_receiver_id, 'coin', 'p2p_transfer', 'credit', _coins, 'success', 'Coins received from vendor', _receiver_bal);

  RETURN jsonb_build_object('ok', true, 'coins_sent', _coins, 'new_balance', _sender_bal - _coins);
END;
$$;

-- 5. Add source column to leads table for multiplier lookup
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'quick';

-- 6. Update accept_lead to use coins
CREATE OR REPLACE FUNCTION public.accept_lead(_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _vendor uuid := auth.uid();
  _lead public.leads%ROWTYPE;
  _coin_cost integer;
  _multiplier numeric;
  _final_coins integer;
  _coin_balance integer;
  _price_paise bigint;
  _wallet_balance bigint;
  _new_count integer;
BEGIN
  IF _vendor IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'auth_required');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.lead_notifications
    WHERE lead_id = _lead_id AND vendor_id = _vendor
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_notified');
  END IF;

  SELECT * INTO _lead FROM public.leads WHERE id = _lead_id FOR UPDATE;

  IF _lead.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF _vendor = ANY(_lead.accepted_vendor_ids) THEN
    RETURN jsonb_build_object('ok', true, 'lead', to_jsonb(_lead), 'already', true);
  END IF;

  IF _lead.accepted_count >= _lead.max_slots THEN
    UPDATE public.lead_notifications
      SET status = 'sold_out', responded_at = now()
      WHERE lead_id = _lead_id AND vendor_id = _vendor AND status = 'pending';
    RETURN jsonb_build_object('ok', false, 'reason', 'sold_out');
  END IF;

  -- Get coin cost from sub-category
  SELECT COALESCE(c.lead_cost_coins, 0) INTO _coin_cost
    FROM public.categories c WHERE c.id = _lead.sub_category_id;
  _coin_cost := COALESCE(_coin_cost, 0);

  -- Get source multiplier
  SELECT COALESCE(m.multiplier, 1) INTO _multiplier
    FROM public.lead_source_multipliers m WHERE m.source_key = _lead.source AND m.is_active = true;
  _multiplier := COALESCE(_multiplier, 1);

  _final_coins := CEIL(_coin_cost::numeric * _multiplier)::integer;

  -- Deduct coins if cost > 0
  IF _final_coins > 0 THEN
    SELECT leadx_coins INTO _coin_balance
      FROM public.vendor_wallets WHERE vendor_id = _vendor FOR UPDATE;

    IF _coin_balance IS NULL THEN
      INSERT INTO public.vendor_wallets (vendor_id) VALUES (_vendor) ON CONFLICT DO NOTHING;
      _coin_balance := 0;
    END IF;

    IF _coin_balance < _final_coins THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'insufficient_coins', 'required', _final_coins, 'balance', _coin_balance);
    END IF;

    UPDATE public.vendor_wallets
      SET leadx_coins = leadx_coins - _final_coins,
          lifetime_coins_used = lifetime_coins_used + _final_coins,
          leads_used = leads_used + 1,
          updated_at = now()
      WHERE vendor_id = _vendor;

    INSERT INTO public.wallet_transactions
      (vendor_id, wallet_kind, txn_type, direction, coins, status, description, reference_id, coin_balance_after)
    VALUES
      (_vendor, 'coin', 'lead_purchase', 'debit', _final_coins, 'success',
       'Lead accepted: ' || _lead.sub_category_name, _lead_id::text, _coin_balance - _final_coins);
  END IF;

  -- Also handle legacy INR deduction if lead_price_inr > 0
  _price_paise := COALESCE(_lead.lead_price_inr, 0)::bigint * 100;
  IF _price_paise > 0 AND _final_coins = 0 THEN
    SELECT service_balance_paise INTO _wallet_balance
      FROM public.vendor_wallets WHERE vendor_id = _vendor FOR UPDATE;
    IF _wallet_balance IS NULL THEN
      INSERT INTO public.vendor_wallets (vendor_id, service_balance_paise) VALUES (_vendor, 0) ON CONFLICT DO NOTHING;
      _wallet_balance := 0;
    END IF;
    IF _wallet_balance < _price_paise THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'insufficient_balance', 'required_paise', _price_paise, 'balance_paise', _wallet_balance);
    END IF;
    UPDATE public.vendor_wallets
      SET service_balance_paise = service_balance_paise - _price_paise,
          lifetime_spent_paise = lifetime_spent_paise + _price_paise,
          leads_used = leads_used + 1,
          updated_at = now()
      WHERE vendor_id = _vendor;
    INSERT INTO public.wallet_transactions
      (vendor_id, wallet_kind, txn_type, direction, amount_paise, status, description, reference_id, balance_after_paise)
    VALUES
      (_vendor, 'service', 'lead_purchase', 'debit', _price_paise, 'success',
       'Lead accepted: ' || _lead.sub_category_name, _lead_id::text, _wallet_balance - _price_paise);
  END IF;

  _new_count := _lead.accepted_count + 1;
  UPDATE public.leads
    SET accepted_vendor_ids = array_append(accepted_vendor_ids, _vendor),
        accepted_count = _new_count,
        accepted_vendor_id = COALESCE(accepted_vendor_id, _vendor),
        accepted_at = COALESCE(accepted_at, now()),
        status = CASE WHEN _new_count >= max_slots THEN 'fulfilled' ELSE 'accepted' END,
        updated_at = now()
    WHERE id = _lead_id
    RETURNING * INTO _lead;

  UPDATE public.lead_notifications
    SET status = 'accepted', responded_at = now()
    WHERE lead_id = _lead_id AND vendor_id = _vendor;

  IF _new_count >= _lead.max_slots THEN
    UPDATE public.lead_notifications
      SET status = 'sold_out', responded_at = now()
      WHERE lead_id = _lead_id AND status = 'pending';
  END IF;

  RETURN jsonb_build_object('ok', true, 'lead', to_jsonb(_lead), 'slots_left', _lead.max_slots - _new_count, 'coins_deducted', _final_coins);
END;
$$;

-- 7. Function to log rate change history (called from admin UI)
CREATE OR REPLACE FUNCTION public.update_coin_rate(_new_rate numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  UPDATE public.coin_pricing_config SET coin_rate_inr = _new_rate, updated_at = now(), updated_by = auth.uid();
  INSERT INTO public.leadx_rate_history (rate_inr) VALUES (_new_rate);
END;
$$;
