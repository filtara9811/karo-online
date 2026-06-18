
-- Extend overview with influencer fee + activation status
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
  _vendor RECORD;
  _is_activated boolean := false;
  _partner_kind text := NULL;
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

  SELECT payment_completed, partner_kind INTO _vendor
    FROM public.vendors WHERE user_id = _uid LIMIT 1;
  IF FOUND THEN
    _is_activated := COALESCE(_vendor.payment_completed, false);
    _partner_kind := _vendor.partner_kind;
  END IF;

  RETURN jsonb_build_object(
    'code', _code.code,
    'kind', _code.kind,
    'wallet', _wallet,
    'settings', jsonb_build_object(
      'is_active', COALESCE(_settings.is_active, true),
      'base_reward_amount', _settings.base_reward_amount,
      'activation_fee', _settings.activation_fee,
      'influencer_activation_fee', COALESCE(_settings.influencer_activation_fee, 499),
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
    'activation', jsonb_build_object(
      'is_activated', _is_activated,
      'partner_kind', _partner_kind
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
        ), '[]'::jsonb)
      ) ORDER BY r.created_at DESC)
      FROM public.referrals r
      LEFT JOIN public.customers c ON c.user_id = r.referred_user_id
      LEFT JOIN public.referral_progress p ON p.referred_user_id = r.referred_user_id
      WHERE r.referrer_user_id = _uid
    ), '[]'::jsonb)
  );
END;
$function$;

-- Mark caller as activated influencer / part-time partner
CREATE OR REPLACE FUNCTION public.mark_influencer_activation(_payment_ref text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _existing RECORD;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Login required'; END IF;

  SELECT id, payment_completed INTO _existing FROM public.vendors WHERE user_id = _uid LIMIT 1;

  IF FOUND THEN
    UPDATE public.vendors
      SET payment_completed = true,
          payment_completed_at = COALESCE(payment_completed_at, now()),
          partner_kind = COALESCE(NULLIF(partner_kind, ''), 'influencer'),
          admin_notes = COALESCE(admin_notes, '') || E'\nINFLUENCER_PAY: ' || COALESCE(_payment_ref, ''),
          updated_at = now()
      WHERE id = _existing.id;
  ELSE
    INSERT INTO public.vendors (user_id, partner_kind, payment_completed, payment_completed_at, status, admin_notes)
      VALUES (_uid, 'influencer', true, now(), 'active', 'INFLUENCER_PAY: ' || COALESCE(_payment_ref, ''));
  END IF;

  PERFORM public.mark_referral_checkpoint(_uid, 'payment_completed');
  PERFORM public.release_referral_reward(_uid);

  RETURN jsonb_build_object('ok', true);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.mark_influencer_activation(text) TO authenticated;
