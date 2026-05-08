
ALTER TABLE public.coin_pricing_config
  ADD COLUMN IF NOT EXISTS total_supply bigint NOT NULL DEFAULT 5000000000;

CREATE OR REPLACE FUNCTION public.get_leadx_market_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result jsonb;
  _supply bigint;
  _rate numeric;
  _sold bigint;
  _returned bigint;
  _circulation bigint;
  _vendor_count int;
BEGIN
  IF NOT is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT total_supply, coin_rate_inr INTO _supply, _rate
    FROM public.coin_pricing_config LIMIT 1;

  SELECT COALESCE(SUM(lifetime_coins_purchased), 0),
         COALESCE(SUM(lifetime_coins_used), 0),
         COALESCE(SUM(leadx_coins), 0),
         COUNT(*) FILTER (WHERE leadx_coins > 0)
    INTO _sold, _returned, _circulation, _vendor_count
    FROM public.vendor_wallets;

  SELECT jsonb_build_object(
    'total_supply', _supply,
    'rate_inr', _rate,
    'sold', _sold,
    'returned', _returned,
    'in_circulation', _circulation,
    'admin_holds', GREATEST(_supply - _circulation, 0),
    'vendor_count', _vendor_count,
    'value_inr_circulation', _circulation * _rate,
    'value_inr_total', _supply * _rate,
    'top_vendors', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'vendor_id', vw.vendor_id,
        'business_name', v.business_name,
        'owner_name', v.owner_name,
        'avatar_url', v.avatar_url,
        'leadx_coins', vw.leadx_coins,
        'lifetime_purchased', vw.lifetime_coins_purchased,
        'lifetime_used', vw.lifetime_coins_used
      ) ORDER BY vw.leadx_coins DESC)
      FROM public.vendor_wallets vw
      LEFT JOIN public.vendors v ON v.user_id = vw.vendor_id
      WHERE vw.leadx_coins > 0
      LIMIT 50
    ), '[]'::jsonb),
    'rate_history', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('rate', rate_inr, 'at', recorded_at) ORDER BY recorded_at)
      FROM (SELECT rate_inr, recorded_at FROM public.leadx_rate_history ORDER BY recorded_at DESC LIMIT 50) h
    ), '[]'::jsonb)
  ) INTO _result;

  RETURN _result;
END;
$$;
