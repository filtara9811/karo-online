-- Referral tracking + wallet hold/release + share preview + security hardening

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS payment_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_completed_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_rewards_once_per_trigger
  ON public.referral_rewards(referral_id, user_id, trigger);

CREATE OR REPLACE FUNCTION public.get_my_wallet_split()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _available numeric := 0;
  _locked numeric := 0;
  _personal_available numeric := 0;
  _team_available numeric := 0;
  _personal_locked numeric := 0;
  _team_locked numeric := 0;
  _today numeric := 0;
  _month numeric := 0;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Login required'; END IF;

  SELECT COALESCE(sum(amount),0) INTO _available
    FROM public.referral_rewards WHERE user_id = _uid AND status = 'approved';
  SELECT COALESCE(sum(amount),0) INTO _locked
    FROM public.referral_rewards WHERE user_id = _uid AND status IN ('pending','locked');
  SELECT COALESCE(sum(amount),0) INTO _personal_available
    FROM public.referral_rewards WHERE user_id = _uid AND status = 'approved' AND level = 1;
  SELECT COALESCE(sum(amount),0) INTO _team_available
    FROM public.referral_rewards WHERE user_id = _uid AND status = 'approved' AND level = 2;
  SELECT COALESCE(sum(amount),0) INTO _personal_locked
    FROM public.referral_rewards WHERE user_id = _uid AND status IN ('pending','locked') AND level = 1;
  SELECT COALESCE(sum(amount),0) INTO _team_locked
    FROM public.referral_rewards WHERE user_id = _uid AND status IN ('pending','locked') AND level = 2;
  SELECT COALESCE(sum(amount),0) INTO _today
    FROM public.referral_rewards
    WHERE user_id = _uid AND status='approved' AND released_at >= date_trunc('day', now());
  SELECT COALESCE(sum(amount),0) INTO _month
    FROM public.referral_rewards
    WHERE user_id = _uid AND status='approved' AND released_at >= date_trunc('month', now());

  RETURN jsonb_build_object(
    'total', _available,
    'available', _available,
    'locked', _locked,
    'grand_total', _available + _locked,
    'personal', _personal_available,
    'team', _team_available,
    'personal_locked', _personal_locked,
    'team_locked', _team_locked,
    'today', _today,
    'this_month', _month
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.apply_referral_code(_code text, _device text DEFAULT NULL::text, _ip text DEFAULT NULL::text, _kind text DEFAULT 'customer'::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _ref public.referral_codes;
  _settings public.referral_settings;
  _device_count int := 0;
  _ip_count int := 0;
  _status text := 'pending';
  _ref_id uuid;
  _l2 uuid;
  _base numeric;
  _new_user_bonus numeric := 100;
  _l1_bonus numeric := 100;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'auth_required'); END IF;
  SELECT * INTO _ref FROM public.referral_codes WHERE upper(code) = upper(trim(_code)) LIMIT 1;
  IF _ref.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid_code'); END IF;
  IF _ref.user_id = _uid THEN RETURN jsonb_build_object('ok', false, 'reason', 'self_referral'); END IF;

  SELECT * INTO _settings FROM public.referral_settings WHERE id = 1;
  _base := COALESCE(_settings.base_reward_amount, 200);

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

  SELECT referrer_user_id INTO _l2
    FROM public.referrals
    WHERE referred_user_id = _ref.user_id
    ORDER BY created_at ASC LIMIT 1;

  INSERT INTO public.referrals (referrer_user_id, referred_user_id, kind, status, device_fingerprint, ip_address, level_2_user_id, source)
  VALUES (_ref.user_id, _uid, COALESCE(NULLIF(_kind,''),'customer'), _status, _device, _ip, _l2, 'deep_link')
  ON CONFLICT (referrer_user_id, referred_user_id) DO UPDATE
    SET updated_at = now(),
        device_fingerprint = COALESCE(public.referrals.device_fingerprint, EXCLUDED.device_fingerprint),
        ip_address = COALESCE(public.referrals.ip_address, EXCLUDED.ip_address),
        level_2_user_id = COALESCE(public.referrals.level_2_user_id, EXCLUDED.level_2_user_id)
  RETURNING id INTO _ref_id;

  INSERT INTO public.referral_progress (referral_id, installed, installed_at, registered, registered_at, otp_verified, otp_verified_at)
  VALUES (_ref_id, true, now(), true, now(), true, now())
  ON CONFLICT (referral_id) DO UPDATE
    SET installed = true,
        installed_at = COALESCE(public.referral_progress.installed_at, now()),
        registered = true,
        registered_at = COALESCE(public.referral_progress.registered_at, now()),
        otp_verified = true,
        otp_verified_at = COALESCE(public.referral_progress.otp_verified_at, now()),
        updated_at = now();

  INSERT INTO public.referral_rewards (referral_id, user_id, amount, trigger, status, level, pct_applied, notes)
  VALUES (_ref_id, _ref.user_id, _base, 'signup_hold_referrer', 'locked', 1, 100, 'Locked until referred user onboards a shop or raises first service request')
  ON CONFLICT (referral_id, user_id, trigger) DO NOTHING;

  INSERT INTO public.referral_rewards (referral_id, user_id, amount, trigger, status, level, pct_applied, notes)
  VALUES (_ref_id, _uid, _new_user_bonus, 'signup_hold_new_user', 'locked', 1, 100, 'Welcome referral bonus locked until qualifying activity')
  ON CONFLICT (referral_id, user_id, trigger) DO NOTHING;

  IF _l2 IS NOT NULL THEN
    INSERT INTO public.referral_rewards (referral_id, user_id, amount, trigger, status, level, pct_applied, notes)
    VALUES (_ref_id, _l2, _l1_bonus, 'signup_hold_level_1', 'locked', 2, 100, 'Team bonus locked until qualifying activity')
    ON CONFLICT (referral_id, user_id, trigger) DO NOTHING;
  END IF;

  RETURN jsonb_build_object('ok', true, 'referral_id', _ref_id, 'status', _status);
END;
$function$;

CREATE OR REPLACE FUNCTION public.release_referral_reward(_vendor_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ref RECORD;
  v_released JSONB := '[]'::jsonb;
BEGIN
  SELECT r.* INTO v_ref
  FROM public.referrals r
  WHERE r.referred_user_id = _vendor_user_id
  ORDER BY r.created_at ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_referral');
  END IF;

  WITH changed AS (
    UPDATE public.referral_rewards
       SET status = 'approved', released_at = COALESCE(released_at, now()), updated_at = now()
     WHERE referral_id = v_ref.id
       AND status IN ('pending','locked')
     RETURNING id, user_id, amount, level
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'user_id', user_id, 'amount', amount, 'level', level)), '[]'::jsonb)
    INTO v_released
  FROM changed;

  UPDATE public.referrals SET status = 'approved', updated_at = now() WHERE id = v_ref.id AND status <> 'approved';
  UPDATE public.referral_progress SET reward_released = true, reward_released_at = COALESCE(reward_released_at, now()), updated_at = now() WHERE referral_id = v_ref.id;

  RETURN jsonb_build_object('ok', true, 'released', v_released);
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_referral_checkpoint(_referred_user_id uuid, _checkpoint text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _ref_id uuid;
  _should_release boolean := false;
BEGIN
  SELECT id INTO _ref_id
    FROM public.referrals WHERE referred_user_id = _referred_user_id
    ORDER BY created_at ASC LIMIT 1;
  IF _ref_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_referral'); END IF;

  IF _checkpoint = 'registered' THEN
    UPDATE public.referral_progress SET registered = true, registered_at = COALESCE(registered_at, now()), updated_at = now() WHERE referral_id = _ref_id;
  ELSIF _checkpoint = 'otp_verified' THEN
    UPDATE public.referral_progress SET otp_verified = true, otp_verified_at = COALESCE(otp_verified_at, now()), updated_at = now() WHERE referral_id = _ref_id;
  ELSIF _checkpoint = 'kyc_completed' THEN
    UPDATE public.referral_progress SET kyc_completed = true, kyc_completed_at = COALESCE(kyc_completed_at, now()), updated_at = now() WHERE referral_id = _ref_id;
  ELSIF _checkpoint = 'became_seller' THEN
    UPDATE public.referral_progress SET became_seller = true, became_seller_at = COALESCE(became_seller_at, now()), updated_at = now() WHERE referral_id = _ref_id;
  ELSIF _checkpoint = 'first_order_placed' THEN
    UPDATE public.referral_progress SET first_order_placed = true, first_order_placed_at = COALESCE(first_order_placed_at, now()), updated_at = now() WHERE referral_id = _ref_id;
    _should_release := true;
  ELSIF _checkpoint = 'payment_completed' THEN
    UPDATE public.referral_progress SET payment_completed = true, payment_completed_at = COALESCE(payment_completed_at, now()), became_seller = true, became_seller_at = COALESCE(became_seller_at, now()), updated_at = now() WHERE referral_id = _ref_id;
    _should_release := true;
  END IF;

  IF _should_release THEN
    PERFORM public.release_referral_reward(_referred_user_id);
  END IF;

  RETURN jsonb_build_object('ok', true, 'referral_id', _ref_id, 'released', _should_release);
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
      'base_reward_amount', COALESCE(_settings.base_reward_amount, 200),
      'activation_fee', COALESCE(_settings.activation_fee, 1000),
      'influencer_activation_fee', COALESCE(_settings.influencer_activation_fee, 499),
      'play_store_url', COALESCE(_settings.play_store_url, 'https://play.google.com/store/apps/details?id=app.karoonline.twa'),
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
        'name', COALESCE(c.name, 'New user'),
        'phone', COALESCE(c.phone, r.referred_phone),
        'avatar_url', c.avatar_url,
        'progress', jsonb_build_object(
          'installed', COALESCE(p.installed, false),
          'registered', COALESCE(p.registered, false),
          'otp_verified', COALESCE(p.otp_verified, false),
          'kyc_completed', COALESCE(p.kyc_completed, false),
          'became_seller', COALESCE(p.became_seller, false),
          'first_order_placed', COALESCE(p.first_order_placed, false),
          'payment_completed', COALESCE(p.payment_completed, false),
          'reward_released', COALESCE(p.reward_released, false)
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
            'name', COALESCE(cc.name, 'New user'),
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
      LEFT JOIN public.referral_progress p ON p.referral_id = r.id
      WHERE r.referrer_user_id = _uid
    ), '[]'::jsonb)
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_my_wallet_split() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apply_referral_code(text, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_referral_checkpoint(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_referral_reward(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_referral_overview() TO authenticated, service_role;

INSERT INTO public.referral_progress (referral_id, installed, installed_at, registered, registered_at, otp_verified, otp_verified_at)
SELECT r.id, true, r.created_at, (r.referred_user_id IS NOT NULL), COALESCE(c.created_at, r.created_at), (r.referred_user_id IS NOT NULL), COALESCE(c.created_at, r.created_at)
FROM public.referrals r
LEFT JOIN public.customers c ON c.user_id = r.referred_user_id
WHERE NOT EXISTS (SELECT 1 FROM public.referral_progress p WHERE p.referral_id = r.id);

INSERT INTO public.referral_rewards (referral_id, user_id, amount, trigger, status, level, pct_applied, notes)
SELECT r.id, r.referrer_user_id, COALESCE(rs.base_reward_amount, 200), 'signup_hold_referrer_backfill',
       CASE WHEN r.status = 'approved' THEN 'approved' ELSE 'locked' END, 1, 100,
       'Backfilled referral reward ledger'
FROM public.referrals r
CROSS JOIN public.referral_settings rs
WHERE rs.id = 1
  AND NOT EXISTS (SELECT 1 FROM public.referral_rewards rr WHERE rr.referral_id = r.id AND rr.user_id = r.referrer_user_id AND rr.level = 1);

INSERT INTO public.referral_rewards (referral_id, user_id, amount, trigger, status, level, pct_applied, notes)
SELECT r.id, r.level_2_user_id, 100, 'signup_hold_level_1_backfill',
       CASE WHEN r.status = 'approved' THEN 'approved' ELSE 'locked' END, 2, 100,
       'Backfilled team referral reward ledger'
FROM public.referrals r
WHERE r.level_2_user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.referral_rewards rr WHERE rr.referral_id = r.id AND rr.user_id = r.level_2_user_id AND rr.level = 2);

UPDATE public.referral_rewards
SET released_at = COALESCE(released_at, updated_at, created_at)
WHERE status = 'approved' AND released_at IS NULL;

CREATE OR REPLACE FUNCTION public.mark_referral_first_request_from_need()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.mark_referral_checkpoint(NEW.user_id, 'first_order_placed');
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_user_needs_referral_first_request ON public.user_needs;
CREATE TRIGGER trg_user_needs_referral_first_request
  AFTER INSERT ON public.user_needs
  FOR EACH ROW EXECUTE FUNCTION public.mark_referral_first_request_from_need();

CREATE OR REPLACE FUNCTION public.mark_referral_vendor_payment_from_vendor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF COALESCE(NEW.payment_completed, false) = true AND COALESCE(OLD.payment_completed, false) = false THEN
    PERFORM public.mark_referral_checkpoint(NEW.user_id, 'payment_completed');
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_vendors_referral_payment ON public.vendors;
CREATE TRIGGER trg_vendors_referral_payment
  AFTER UPDATE OF payment_completed ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.mark_referral_vendor_payment_from_vendor();

CREATE OR REPLACE FUNCTION public.get_public_share_preview(_kind text, _code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _norm text := upper(trim(coalesce(_code, '')));
  _uid uuid;
  _settings public.referral_settings;
  _customer public.customers;
  _merchant public.customers;
BEGIN
  IF _norm = '' THEN RETURN jsonb_build_object('ok', false); END IF;

  IF _kind = 'referral' THEN
    SELECT user_id INTO _uid FROM public.referral_codes WHERE upper(code) = _norm LIMIT 1;
    SELECT * INTO _settings FROM public.referral_settings WHERE id = 1;
    IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false); END IF;
    SELECT * INTO _customer FROM public.customers WHERE user_id = _uid LIMIT 1;
    RETURN jsonb_build_object(
      'ok', true,
      'kind', 'referral',
      'code', _norm,
      'title', 'Get ₹200 for you & ₹100 for your friend!',
      'description', 'Use my code ' || _norm || ' on Karo Online. Signup referral bonus is tracked automatically.',
      'image_url', COALESCE(_settings.banner_image_url, 'https://karoonline.in/referral-share-banner.jpg'),
      'referrer_name', COALESCE(_customer.name, 'Karo Online member'),
      'play_store_url', COALESCE(_settings.play_store_url, 'https://play.google.com/store/apps/details?id=app.karoonline.twa')
    );
  END IF;

  IF _kind = 'card' THEN
    SELECT * INTO _merchant FROM public.customers WHERE upper(referral_code) = _norm LIMIT 1;
    IF _merchant.id IS NULL THEN
      SELECT c.* INTO _merchant
      FROM public.referral_codes rc
      JOIN public.customers c ON c.user_id = rc.user_id
      WHERE upper(rc.code) = _norm
      LIMIT 1;
    END IF;
    IF _merchant.id IS NULL THEN RETURN jsonb_build_object('ok', false); END IF;
    RETURN jsonb_build_object(
      'ok', true,
      'kind', 'card',
      'code', _norm,
      'title', COALESCE(_merchant.shop_name, _merchant.name, 'Karo Online Business Card'),
      'description', 'Digital visiting card on Karo Online. Tap to save contact and open the app.',
      'image_url', COALESCE(_merchant.card_back_image_url, _merchant.avatar_url, 'https://karoonline.in/referral-share-banner.jpg'),
      'merchant_name', COALESCE(_merchant.shop_name, _merchant.name, 'Karo Online Merchant')
    );
  END IF;

  RETURN jsonb_build_object('ok', false);
END;
$function$;
GRANT EXECUTE ON FUNCTION public.get_public_share_preview(text, text) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "feedback-screenshots authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "feedback-screenshots owner insert" ON storage.objects;
DROP POLICY IF EXISTS "feedback-screenshots owner or admin read" ON storage.objects;
DROP POLICY IF EXISTS "feedback-screenshots owner update" ON storage.objects;
DROP POLICY IF EXISTS "feedback-screenshots owner delete" ON storage.objects;

CREATE POLICY "feedback-screenshots owner insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'feedback-screenshots'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

CREATE POLICY "feedback-screenshots owner or admin read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'feedback-screenshots'
  AND ((storage.foldername(name))[1] = (auth.uid())::text OR public.is_admin_user(auth.uid()))
);

CREATE POLICY "feedback-screenshots owner update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'feedback-screenshots'
  AND ((storage.foldername(name))[1] = (auth.uid())::text OR public.is_admin_user(auth.uid()))
)
WITH CHECK (
  bucket_id = 'feedback-screenshots'
  AND ((storage.foldername(name))[1] = (auth.uid())::text OR public.is_admin_user(auth.uid()))
);

CREATE POLICY "feedback-screenshots owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'feedback-screenshots'
  AND ((storage.foldername(name))[1] = (auth.uid())::text OR public.is_admin_user(auth.uid()))
);

DROP POLICY IF EXISTS "Vendors see needs in their categories" ON public.user_needs;
DROP POLICY IF EXISTS "Vendors see needs only after active lead" ON public.user_needs;
CREATE POLICY "Vendors see needs only after active lead"
  ON public.user_needs
  FOR SELECT
  TO authenticated
  USING (
    status = 'active'
    AND EXISTS (
      SELECT 1
      FROM public.leads l
      WHERE l.customer_id = user_needs.user_id
        AND l.accepted_vendor_id = auth.uid()
        AND l.status IN ('accepted','in_progress','completed')
    )
  );