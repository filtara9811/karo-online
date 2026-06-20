-- Phase 6/7 — Align referral split with configured percentages and add KYC gate helper.

-- 1) Recompute apply_referral_code to honor level_1_pct (₹180) and level_2_pct (₹20)
--    against base_reward_amount (₹200), and keep the new-user welcome bonus separate.
CREATE OR REPLACE FUNCTION public.apply_referral_code(
  _code text,
  _device text DEFAULT NULL::text,
  _ip text DEFAULT NULL::text,
  _kind text DEFAULT 'customer'::text
) RETURNS jsonb
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
  _l1_pct numeric;
  _l2_pct numeric;
  _l1_amt numeric;
  _l2_amt numeric;
  _signup_bonus numeric := 100;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'auth_required'); END IF;
  SELECT * INTO _ref FROM public.referral_codes WHERE upper(code) = upper(trim(_code)) LIMIT 1;
  IF _ref.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid_code'); END IF;
  IF _ref.user_id = _uid THEN RETURN jsonb_build_object('ok', false, 'reason', 'self_referral'); END IF;

  SELECT * INTO _settings FROM public.referral_settings WHERE id = 1;
  _base   := COALESCE(_settings.base_reward_amount, 200);
  _l1_pct := COALESCE(_settings.level_1_pct, 90);
  _l2_pct := COALESCE(_settings.level_2_pct, 10);
  _l1_amt := round(_base * _l1_pct / 100.0, 2);   -- ₹180 default
  _l2_amt := round(_base * _l2_pct / 100.0, 2);   -- ₹20  default

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

  -- Direct referrer commission (₹180 default) — 90% of base_reward_amount
  INSERT INTO public.referral_rewards (referral_id, user_id, amount, trigger, status, level, pct_applied, notes)
  VALUES (_ref_id, _ref.user_id, _l1_amt, 'signup_hold_referrer', 'locked', 1, _l1_pct,
          'Direct commission locked until referred user activates (₹' || _l1_amt::text || ' = ' || _l1_pct::text || '% of ₹' || _base::text || ')')
  ON CONFLICT (referral_id, user_id, trigger) DO UPDATE
    SET amount = EXCLUDED.amount, pct_applied = EXCLUDED.pct_applied, notes = EXCLUDED.notes;

  -- Upline (level-2) team override (₹20 default) — 10% of base_reward_amount
  IF _l2 IS NOT NULL THEN
    INSERT INTO public.referral_rewards (referral_id, user_id, amount, trigger, status, level, pct_applied, notes)
    VALUES (_ref_id, _l2, _l2_amt, 'signup_hold_level_1', 'locked', 2, _l2_pct,
            'Team override locked until referred user activates (₹' || _l2_amt::text || ' = ' || _l2_pct::text || '% of ₹' || _base::text || ')')
    ON CONFLICT (referral_id, user_id, trigger) DO UPDATE
      SET amount = EXCLUDED.amount, pct_applied = EXCLUDED.pct_applied, notes = EXCLUDED.notes;
  END IF;

  -- Welcome signup bonus for the new user
  INSERT INTO public.referral_rewards (referral_id, user_id, amount, trigger, status, level, pct_applied, notes)
  VALUES (_ref_id, _uid, _signup_bonus, 'signup_hold_new_user', 'locked', 1, 100,
          'Welcome signup bonus (₹' || _signup_bonus::text || ') locked until first qualifying activity')
  ON CONFLICT (referral_id, user_id, trigger) DO NOTHING;

  RETURN jsonb_build_object(
    'ok', true,
    'referral_id', _ref_id,
    'status', _status,
    'split', jsonb_build_object(
      'referrer_amount', _l1_amt,
      'upline_amount', _l2_amt,
      'new_user_bonus', _signup_bonus
    )
  );
END;
$function$;

-- 2) KYC gate helper for the withdraw flow.
--    Returns the user's PAN + bank prefill plus per-step verification status.
CREATE OR REPLACE FUNCTION public.get_my_kyc_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _selfie text;
  _aadhaar text;
  _pan_status text;
  _bank_status text;
  _pan_num text;
  _bank_rp jsonb;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'auth_required'); END IF;

  SELECT lower(status) INTO _selfie FROM public.kyc_verifications
    WHERE subject_user_id = _uid AND check_type = 'selfie' ORDER BY created_at DESC LIMIT 1;
  SELECT lower(status) INTO _aadhaar FROM public.kyc_verifications
    WHERE subject_user_id = _uid AND check_type = 'aadhaar' ORDER BY created_at DESC LIMIT 1;
  SELECT lower(status), document_number INTO _pan_status, _pan_num FROM public.kyc_verifications
    WHERE subject_user_id = _uid AND check_type = 'pan' ORDER BY created_at DESC LIMIT 1;
  SELECT lower(status), request_payload INTO _bank_status, _bank_rp FROM public.kyc_verifications
    WHERE subject_user_id = _uid AND check_type = 'bank' ORDER BY created_at DESC LIMIT 1;

  RETURN jsonb_build_object(
    'ok', true,
    'selfie_ok',  _selfie  IN ('verified','approved','passed','submitted'),
    'aadhaar_ok', _aadhaar IN ('verified','approved','passed','submitted'),
    'pan_ok',     _pan_status  IN ('verified','approved','passed','submitted'),
    'bank_ok',    _bank_status IN ('verified','approved','passed','submitted'),
    'pan_number', _pan_num,
    'bank',       _bank_rp
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_kyc_status() TO authenticated;

-- 3) Dry-run helper: read-only summary of an existing referral's reward split.
CREATE OR REPLACE FUNCTION public.admin_referral_dry_run(_referred_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _is_admin boolean;
  _ref_id uuid;
  _rows jsonb;
BEGIN
  SELECT public.has_role(auth.uid(), 'admin') INTO _is_admin;
  IF NOT COALESCE(_is_admin, false) THEN RETURN jsonb_build_object('ok', false, 'reason', 'forbidden'); END IF;

  SELECT id INTO _ref_id FROM public.referrals WHERE referred_user_id = _referred_user_id ORDER BY created_at ASC LIMIT 1;
  IF _ref_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_referral'); END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'user_id', user_id, 'amount', amount, 'trigger', trigger,
    'status', status, 'level', level, 'pct_applied', pct_applied
  ) ORDER BY level, trigger) INTO _rows
  FROM public.referral_rewards WHERE referral_id = _ref_id;

  RETURN jsonb_build_object('ok', true, 'referral_id', _ref_id, 'rewards', COALESCE(_rows, '[]'::jsonb));
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_referral_dry_run(uuid) TO authenticated;