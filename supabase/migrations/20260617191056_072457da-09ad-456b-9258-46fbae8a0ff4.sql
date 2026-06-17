
-- 1) Extend referral_settings with dynamic admin controls
ALTER TABLE public.referral_settings
  ADD COLUMN IF NOT EXISTS base_reward_amount numeric NOT NULL DEFAULT 200,
  ADD COLUMN IF NOT EXISTS level_1_pct numeric NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS level_2_pct numeric NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS max_split_pct numeric NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS activation_fee numeric NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS play_store_url text NOT NULL DEFAULT 'https://play.google.com/store/apps/details?id=app.karoonline.twa',
  ADD COLUMN IF NOT EXISTS banner_image_url text,
  ADD COLUMN IF NOT EXISTS banner_title text DEFAULT 'Refer & Earn ₹200',
  ADD COLUMN IF NOT EXISTS banner_subtitle text DEFAULT 'Invite friends, earn rewards in your wallet',
  ADD COLUMN IF NOT EXISTS offer_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS offer_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS offer_label text;

-- 2) Freeze 2-level lineage on referrals
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS level_2_user_id uuid;

-- 3) Tag reward rows by level + applied %
ALTER TABLE public.referral_rewards
  ADD COLUMN IF NOT EXISTS level smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS pct_applied numeric;

-- 4) 4+4 referral code generator (e.g. ASHU9876)
CREATE OR REPLACE FUNCTION public.ensure_my_referral_code_v2(_first_name text, _phone text, _kind text DEFAULT 'customer')
RETURNS public.referral_codes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.referral_codes;
  _name_part text;
  _phone_part text;
  _base text;
  _candidate text;
  _suffix int := 0;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Login required'; END IF;

  SELECT * INTO _row FROM public.referral_codes WHERE user_id = _uid;
  -- Keep existing 4+4 codes; only regenerate if missing or still in old REF-/VEN- form
  IF _row.id IS NOT NULL AND _row.code !~ '^(REF|VEN)-' THEN
    RETURN _row;
  END IF;

  _name_part := upper(regexp_replace(COALESCE(_first_name,''), '[^A-Za-z]', '', 'g'));
  _name_part := COALESCE(NULLIF(left(_name_part, 4), ''), 'USER');
  WHILE length(_name_part) < 4 LOOP _name_part := _name_part || 'X'; END LOOP;

  _phone_part := right(regexp_replace(COALESCE(_phone,''), '\D', '', 'g'), 4);
  IF length(_phone_part) < 4 THEN
    _phone_part := lpad(_phone_part, 4, '0');
  END IF;

  _base := _name_part || _phone_part;
  _candidate := _base;
  WHILE EXISTS (SELECT 1 FROM public.referral_codes WHERE code = _candidate AND user_id <> _uid) LOOP
    _suffix := _suffix + 1;
    _candidate := _base || _suffix::text;
  END LOOP;

  IF _row.id IS NULL THEN
    INSERT INTO public.referral_codes (user_id, code, kind)
    VALUES (_uid, _candidate, _kind)
    RETURNING * INTO _row;
  ELSE
    UPDATE public.referral_codes SET code = _candidate, kind = _kind WHERE user_id = _uid
    RETURNING * INTO _row;
  END IF;
  RETURN _row;
END;
$$;

-- 5) Wallet split (direct vs team)
CREATE OR REPLACE FUNCTION public.get_my_wallet_split()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _total numeric := 0;
  _personal numeric := 0;
  _team numeric := 0;
  _today numeric := 0;
  _month numeric := 0;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Login required'; END IF;
  SELECT COALESCE(sum(amount),0) INTO _total
    FROM public.referral_rewards WHERE user_id = _uid AND status = 'approved';
  SELECT COALESCE(sum(amount),0) INTO _personal
    FROM public.referral_rewards WHERE user_id = _uid AND status = 'approved' AND level = 1;
  SELECT COALESCE(sum(amount),0) INTO _team
    FROM public.referral_rewards WHERE user_id = _uid AND status = 'approved' AND level = 2;
  SELECT COALESCE(sum(amount),0) INTO _today
    FROM public.referral_rewards
    WHERE user_id = _uid AND status='approved' AND released_at >= date_trunc('day', now());
  SELECT COALESCE(sum(amount),0) INTO _month
    FROM public.referral_rewards
    WHERE user_id = _uid AND status='approved' AND released_at >= date_trunc('month', now());
  RETURN jsonb_build_object(
    'total', _total, 'personal', _personal, 'team', _team,
    'today', _today, 'this_month', _month
  );
END;
$$;

-- 6) Update apply_referral_code to freeze level_2_user_id
CREATE OR REPLACE FUNCTION public.apply_referral_code(_code text, _device text DEFAULT NULL, _ip text DEFAULT NULL, _kind text DEFAULT 'customer')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _ref public.referral_codes;
  _settings public.referral_settings;
  _device_count int := 0;
  _ip_count int := 0;
  _status text := 'pending';
  _ref_id uuid;
  _l2 uuid;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'auth_required'); END IF;
  SELECT * INTO _ref FROM public.referral_codes WHERE code = _code;
  IF _ref.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid_code'); END IF;
  IF _ref.user_id = _uid THEN RETURN jsonb_build_object('ok', false, 'reason', 'self_referral'); END IF;

  SELECT * INTO _settings FROM public.referral_settings WHERE id = 1;

  IF _device IS NOT NULL THEN
    SELECT count(*) INTO _device_count FROM public.referrals
      WHERE referrer_user_id = _ref.user_id AND device_fingerprint = _device
        AND created_at > now() - interval '24 hours';
    IF _device_count >= COALESCE(_settings.fraud_max_per_device, 3) THEN _status := 'locked'; END IF;
  END IF;
  IF _ip IS NOT NULL THEN
    SELECT count(*) INTO _ip_count FROM public.referrals
      WHERE referrer_user_id = _ref.user_id AND ip_address = _ip
        AND created_at > now() - interval '24 hours';
    IF _ip_count >= COALESCE(_settings.fraud_max_per_ip, 5) THEN _status := 'locked'; END IF;
  END IF;

  -- Capture upline (referrer's own referrer)
  SELECT referrer_user_id INTO _l2
    FROM public.referrals
    WHERE referred_user_id = _ref.user_id
    ORDER BY created_at ASC LIMIT 1;

  INSERT INTO public.referrals (referrer_user_id, referred_user_id, kind, status, device_fingerprint, ip_address, level_2_user_id)
  VALUES (_ref.user_id, _uid, _kind, _status, _device, _ip, _l2)
  ON CONFLICT (referrer_user_id, referred_user_id) DO UPDATE
    SET updated_at = now(),
        level_2_user_id = COALESCE(public.referrals.level_2_user_id, EXCLUDED.level_2_user_id)
  RETURNING id INTO _ref_id;

  INSERT INTO public.referral_progress (referral_id, installed, installed_at, registered, registered_at)
  VALUES (_ref_id, true, now(), true, now())
  ON CONFLICT (referral_id) DO UPDATE SET registered = true, registered_at = COALESCE(public.referral_progress.registered_at, now());

  RETURN jsonb_build_object('ok', true, 'referral_id', _ref_id, 'status', _status);
END;
$$;

-- 7) Release the reward when activation payment completes
CREATE OR REPLACE FUNCTION public.release_referral_reward(_referred_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _r public.referrals;
  _s public.referral_settings;
  _l1_pct numeric;
  _l2_pct numeric;
  _l1_amount numeric;
  _l2_amount numeric;
BEGIN
  SELECT * INTO _r FROM public.referrals
   WHERE referred_user_id = _referred_user_id
   ORDER BY created_at ASC LIMIT 1;
  IF _r.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_referral'); END IF;

  SELECT * INTO _s FROM public.referral_settings WHERE id = 1;
  _l1_pct := LEAST(COALESCE(_s.level_1_pct, 90), COALESCE(_s.max_split_pct, 100) + 50); -- L1 may exceed ceiling; ceiling guards L2 only
  _l2_pct := LEAST(COALESCE(_s.level_2_pct, 10), COALESCE(_s.max_split_pct, 50));
  _l1_amount := round(COALESCE(_s.base_reward_amount, 200) * _l1_pct / 100.0, 2);
  _l2_amount := round(COALESCE(_s.base_reward_amount, 200) * _l2_pct / 100.0, 2);

  -- Level 1: direct referrer
  IF _l1_amount > 0 AND NOT EXISTS (
    SELECT 1 FROM public.referral_rewards
     WHERE referral_id = _r.id AND level = 1 AND trigger = 'activation_payment'
  ) THEN
    INSERT INTO public.referral_rewards
      (referral_id, user_id, amount, trigger, status, level, pct_applied)
    VALUES
      (_r.id, _r.referrer_user_id, _l1_amount, 'activation_payment', 'approved', 1, _l1_pct);
  END IF;

  -- Level 2: upline override
  IF _r.level_2_user_id IS NOT NULL AND _l2_amount > 0 AND NOT EXISTS (
    SELECT 1 FROM public.referral_rewards
     WHERE referral_id = _r.id AND level = 2 AND trigger = 'activation_payment'
  ) THEN
    INSERT INTO public.referral_rewards
      (referral_id, user_id, amount, trigger, status, level, pct_applied)
    VALUES
      (_r.id, _r.level_2_user_id, _l2_amount, 'activation_payment', 'approved', 2, _l2_pct);
  END IF;

  -- Flip status + progress
  UPDATE public.referrals SET status = 'approved', updated_at = now() WHERE id = _r.id;
  UPDATE public.referral_progress
     SET payment_completed = true,
         payment_completed_at = COALESCE(payment_completed_at, now()),
         reward_released = true,
         reward_released_at = now()
   WHERE referral_id = _r.id;

  RETURN jsonb_build_object('ok', true, 'l1', _l1_amount, 'l2', _l2_amount);
END;
$$;

-- 8) Overview v2: include downline count and team earnings per row
CREATE OR REPLACE FUNCTION public.get_my_referral_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _code public.referral_codes;
  _settings public.referral_settings;
  _wallet jsonb;
  _result jsonb;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Login required'; END IF;
  SELECT * INTO _code FROM public.referral_codes WHERE user_id = _uid;
  IF _code.id IS NULL THEN
    SELECT * INTO _code FROM public.ensure_my_referral_code('customer');
  END IF;

  SELECT * INTO _settings FROM public.referral_settings WHERE id = 1;
  SELECT public.get_my_wallet_split() INTO _wallet;

  SELECT jsonb_build_object(
    'code', _code.code,
    'kind', _code.kind,
    'wallet', _wallet,
    'settings', jsonb_build_object(
      'base_reward_amount', _settings.base_reward_amount,
      'activation_fee', _settings.activation_fee,
      'play_store_url', _settings.play_store_url,
      'banner_image_url', _settings.banner_image_url,
      'banner_title', _settings.banner_title,
      'banner_subtitle', _settings.banner_subtitle,
      'offer_active', _settings.offer_active,
      'offer_ends_at', _settings.offer_ends_at,
      'offer_label', _settings.offer_label
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
            'name', dc.name,
            'phone', dc.phone,
            'status', dr.status
          ) ORDER BY dr.created_at DESC)
          FROM (
            SELECT * FROM public.referrals dr2
            WHERE dr2.referrer_user_id = r.referred_user_id
            ORDER BY dr2.created_at DESC LIMIT 5
          ) dr
          LEFT JOIN public.customers dc ON dc.user_id = dr.referred_user_id
        ), '[]'::jsonb)
      ) ORDER BY r.created_at DESC)
      FROM public.referrals r
      LEFT JOIN public.referral_progress p ON p.referral_id = r.id
      LEFT JOIN public.customers c ON c.user_id = r.referred_user_id
      WHERE r.referrer_user_id = _uid
    ), '[]'::jsonb)
  ) INTO _result;
  RETURN _result;
END;
$$;

-- 9) Admin update for referral_settings (single source of truth)
CREATE OR REPLACE FUNCTION public.admin_update_referral_settings(_patch jsonb)
RETURNS public.referral_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _row public.referral_settings;
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;

  UPDATE public.referral_settings SET
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
    updated_at = now()
  WHERE id = 1
  RETURNING * INTO _row;
  RETURN _row;
END;
$$;
