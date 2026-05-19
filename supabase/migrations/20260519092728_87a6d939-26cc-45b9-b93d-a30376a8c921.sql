
-- 4-digit Support Code for unified Customer = Vendor lookup
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS support_code text;

CREATE UNIQUE INDEX IF NOT EXISTS customers_support_code_key
  ON public.customers(support_code) WHERE support_code IS NOT NULL;

-- Generator: try random 4-digit codes until unused
CREATE OR REPLACE FUNCTION public.generate_support_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _code text;
  _exists boolean;
  _i int := 0;
BEGIN
  LOOP
    _i := _i + 1;
    _code := lpad((1000 + floor(random() * 9000))::int::text, 4, '0');
    SELECT EXISTS(SELECT 1 FROM public.customers WHERE support_code = _code) INTO _exists;
    IF NOT _exists THEN
      RETURN _code;
    END IF;
    IF _i > 200 THEN
      -- fallback: sequence-like 5-digit if 4-digit space exhausted
      RETURN lpad((10000 + floor(random() * 90000))::int::text, 5, '0');
    END IF;
  END LOOP;
END;
$$;

-- Trigger: auto-fill support_code on insert
CREATE OR REPLACE FUNCTION public.tg_customers_support_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.support_code IS NULL OR NEW.support_code = '' THEN
    NEW.support_code := public.generate_support_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_customers_support_code ON public.customers;
CREATE TRIGGER trg_customers_support_code
  BEFORE INSERT ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.tg_customers_support_code();

-- Backfill existing rows
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.customers WHERE support_code IS NULL LOOP
    UPDATE public.customers SET support_code = public.generate_support_code() WHERE id = r.id;
  END LOOP;
END $$;

-- Admin manual wallet adjustment (logged)
CREATE OR REPLACE FUNCTION public.admin_adjust_wallet(
  _user_id uuid,
  _kind text,                -- 'coin' | 'service'
  _direction text,           -- 'credit' | 'debit'
  _amount bigint,            -- coins (int) OR paise (bigint)
  _reason text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _bal_coins int;
  _bal_paise bigint;
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO public.vendor_wallets (vendor_id) VALUES (_user_id)
    ON CONFLICT DO NOTHING;

  IF _kind = 'coin' THEN
    IF _direction = 'credit' THEN
      UPDATE public.vendor_wallets
         SET leadx_coins = leadx_coins + _amount::int,
             lifetime_coins_purchased = lifetime_coins_purchased + _amount::int,
             updated_at = now()
       WHERE vendor_id = _user_id
       RETURNING leadx_coins INTO _bal_coins;
    ELSE
      UPDATE public.vendor_wallets
         SET leadx_coins = GREATEST(0, leadx_coins - _amount::int),
             updated_at = now()
       WHERE vendor_id = _user_id
       RETURNING leadx_coins INTO _bal_coins;
    END IF;
    INSERT INTO public.wallet_transactions
      (vendor_id, wallet_kind, txn_type, direction, coins, status, description, coin_balance_after)
    VALUES
      (_user_id, 'coin', 'admin_adjustment', _direction, _amount::int, 'success',
       COALESCE(_reason, 'Admin adjustment'), _bal_coins);
    RETURN jsonb_build_object('ok', true, 'balance_coins', _bal_coins);
  ELSE
    IF _direction = 'credit' THEN
      UPDATE public.vendor_wallets
         SET service_balance_paise = service_balance_paise + _amount,
             lifetime_recharged_paise = lifetime_recharged_paise + _amount,
             updated_at = now()
       WHERE vendor_id = _user_id
       RETURNING service_balance_paise INTO _bal_paise;
    ELSE
      UPDATE public.vendor_wallets
         SET service_balance_paise = GREATEST(0, service_balance_paise - _amount),
             updated_at = now()
       WHERE vendor_id = _user_id
       RETURNING service_balance_paise INTO _bal_paise;
    END IF;
    INSERT INTO public.wallet_transactions
      (vendor_id, wallet_kind, txn_type, direction, amount_paise, status, description, balance_after_paise)
    VALUES
      (_user_id, 'service', 'admin_adjustment', _direction, _amount, 'success',
       COALESCE(_reason, 'Admin adjustment'), _bal_paise);
    RETURN jsonb_build_object('ok', true, 'balance_paise', _bal_paise);
  END IF;
END;
$$;
