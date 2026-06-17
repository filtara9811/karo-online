
ALTER TABLE public.referral_settings
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS royalty_tiers jsonb NOT NULL DEFAULT '[
    {"min_recruits": 5,  "bonus_pct": 10},
    {"min_recruits": 10, "bonus_pct": 20},
    {"min_recruits": 25, "bonus_pct": 30},
    {"min_recruits": 50, "bonus_pct": 50}
  ]'::jsonb;

CREATE OR REPLACE FUNCTION public.admin_update_referral_settings(_patch jsonb)
RETURNS public.referral_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _row public.referral_settings;
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.referral_settings SET
    is_active           = COALESCE((_patch->>'is_active')::boolean, is_active),
    base_reward_amount  = COALESCE((_patch->>'base_reward_amount')::numeric, base_reward_amount),
    level_1_pct         = COALESCE((_patch->>'level_1_pct')::numeric, level_1_pct),
    level_2_pct         = COALESCE((_patch->>'level_2_pct')::numeric, level_2_pct),
    max_split_pct       = COALESCE((_patch->>'max_split_pct')::numeric, max_split_pct),
    activation_fee      = COALESCE((_patch->>'activation_fee')::numeric, activation_fee),
    play_store_url      = COALESCE(_patch->>'play_store_url', play_store_url),
    banner_image_url    = COALESCE(_patch->>'banner_image_url', banner_image_url),
    banner_title        = COALESCE(_patch->>'banner_title', banner_title),
    banner_subtitle     = COALESCE(_patch->>'banner_subtitle', banner_subtitle),
    offer_active        = COALESCE((_patch->>'offer_active')::boolean, offer_active),
    offer_ends_at       = COALESCE((_patch->>'offer_ends_at')::timestamptz, offer_ends_at),
    offer_label         = COALESCE(_patch->>'offer_label', offer_label),
    royalty_tiers       = COALESCE(_patch->'royalty_tiers', royalty_tiers),
    updated_at          = now()
  WHERE id = 1
  RETURNING * INTO _row;
  RETURN _row;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_referral_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _code public.referral_codes;
  _settings public.referral_settings;
  _wallet jsonb;
  _direct_count int;
  _result jsonb;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Login required'; END IF;
  SELECT * INTO _settings FROM public.referral_settings WHERE id = 1;
  SELECT * INTO _code FROM public.referral_codes WHERE user_id = _uid;
  IF _code.id IS NULL AND COALESCE(_settings.is_active, true) THEN
    SELECT * INTO _code FROM public.ensure_my_referral_code('customer');
  END IF;
  SELECT public.get_my_wallet_split() INTO _wallet;
  SELECT count(*) INTO _direct_count FROM public.referrals
    WHERE referrer_user_id = _uid AND status = 'approved';

  SELECT jsonb_build_object(
    'code', _code.code,
    'kind', _code.kind,
    'wallet', _wallet,
    'settings', jsonb_build_object(
      'is_active', COALESCE(_settings.is_active, true),
      'base_reward_amount', _settings.base_reward_amount,
      'activation_fee', _settings.activation_fee,
      'play_store_url', _settings.play_store_url,
      'banner_image_url', _settings.banner_image_url,
      'banner_title', _settings.banner_title,
      'banner_subtitle', _settings.banner_subtitle,
      'offer_active', _settings.offer_active,
      'offer_ends_at', _settings.offer_ends_at,
      'offer_label', _settings.offer_label,
      'royalty_tiers', COALESCE(_settings.royalty_tiers, '[]'::jsonb),
      'direct_recruits', _direct_count
    ),
    'stats', jsonb_build_object(
      'total_invited', (SELECT count(*) FROM public.referrals WHERE referrer_user_id = _uid),
      'successful',    (SELECT count(*) FROM public.referrals WHERE referrer_user_id = _uid AND status = 'approved'),
      'pending',       (SELECT count(*) FROM public.referrals WHERE referrer_user_id = _uid AND status IN ('pending','locked')),
      'earnings_total',   COALESCE((SELECT sum(amount) FROM public.referral_rewards WHERE user_id = _uid AND status = 'approved'), 0),
      'earnings_pending', COALESCE((SELECT sum(amount) FROM public.referral_rewards WHERE user_id = _uid AND status IN ('pending','locked')), 0)
    ),
    'referrals', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', r.id,
        'status', r.status,
        'created_at', r.created_at,
        'name', c.name,
        'phone', c.phone,
        'avatar_url', c.avatar_url,
        'progress', jsonb_build_object(
          'installed', p.installed,
          'registered', p.registered,
          'otp_verified', p.otp_verified,
          'kyc_completed', p.kyc_completed,
          'became_seller', p.became_seller,
          'first_order_placed', p.first_order_placed,
          'payment_completed', p.payment_completed,
          'reward_released', p.reward_released
        ),
        'downline_count', (
          SELECT count(*) FROM public.referrals dr WHERE dr.referrer_user_id = r.referred_user_id
        ),
        'downline_earnings', COALESCE((
          SELECT sum(rr.amount) FROM public.referral_rewards rr
          JOIN public.referrals dr ON dr.id = rr.referral_id
          WHERE dr.referrer_user_id = r.referred_user_id
            AND rr.user_id = _uid AND rr.status = 'approved'
        ), 0),
        'downline', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'name', cc.name,
            'phone', cc.phone,
            'status', dr.status
          ) ORDER BY dr.created_at DESC)
          FROM public.referrals dr
          LEFT JOIN public.customers cc ON cc.user_id = dr.referred_user_id
          WHERE dr.referrer_user_id = r.referred_user_id
          LIMIT 10
        ), '[]'::jsonb)
      ) ORDER BY r.created_at DESC)
      FROM public.referrals r
      LEFT JOIN public.customers c ON c.user_id = r.referred_user_id
      LEFT JOIN public.referral_progress p ON p.referral_id = r.id
      WHERE r.referrer_user_id = _uid
    ), '[]'::jsonb)
  ) INTO _result;
  RETURN _result;
END;
$function$;

DROP FUNCTION IF EXISTS public.release_referral_reward(uuid);
CREATE OR REPLACE FUNCTION public.release_referral_reward(_referred_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _settings public.referral_settings;
BEGIN
  SELECT * INTO _settings FROM public.referral_settings WHERE id = 1;
  IF NOT COALESCE(_settings.is_active, true) THEN
    RETURN;
  END IF;
  PERFORM public.mark_referral_checkpoint(_referred_user_id, 'payment_completed');
END;
$function$;
