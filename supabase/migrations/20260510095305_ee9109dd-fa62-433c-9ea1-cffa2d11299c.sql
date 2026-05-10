
-- =========================================================
-- REFERRAL & REWARDS SYSTEM (extension only)
-- =========================================================

-- 1) referral_codes
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  kind text NOT NULL DEFAULT 'customer' CHECK (kind IN ('customer','vendor')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rc_select_own_or_admin" ON public.referral_codes
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_user(auth.uid()));
CREATE POLICY "rc_insert_self_or_admin" ON public.referral_codes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_admin_user(auth.uid()));
CREATE POLICY "rc_update_admin" ON public.referral_codes
  FOR UPDATE TO authenticated USING (public.is_admin_user(auth.uid()));
CREATE POLICY "rc_delete_admin" ON public.referral_codes
  FOR DELETE TO authenticated USING (public.is_admin_user(auth.uid()));
-- Public can resolve a code -> user_id when landing on /r/:code (needed for attribution)
CREATE POLICY "rc_public_resolve" ON public.referral_codes
  FOR SELECT TO anon USING (true);

-- 2) referrals
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL,
  referred_user_id uuid,
  referred_phone text,
  kind text NOT NULL DEFAULT 'customer' CHECK (kind IN ('customer','vendor')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','locked','approved','rejected')),
  device_fingerprint text,
  ip_address text,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referrer_user_id, referred_user_id)
);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals(referred_user_id);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ref_select_own_or_admin" ON public.referrals
  FOR SELECT TO authenticated
  USING (auth.uid() = referrer_user_id OR auth.uid() = referred_user_id OR public.is_admin_user(auth.uid()));
CREATE POLICY "ref_insert_self_or_admin" ON public.referrals
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = referred_user_id OR public.is_admin_user(auth.uid()));
CREATE POLICY "ref_update_admin" ON public.referrals
  FOR UPDATE TO authenticated USING (public.is_admin_user(auth.uid()));
CREATE POLICY "ref_delete_admin" ON public.referrals
  FOR DELETE TO authenticated USING (public.is_admin_user(auth.uid()));

-- 3) referral_progress
CREATE TABLE IF NOT EXISTS public.referral_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE UNIQUE,
  installed boolean NOT NULL DEFAULT true,
  installed_at timestamptz DEFAULT now(),
  registered boolean NOT NULL DEFAULT false,
  registered_at timestamptz,
  otp_verified boolean NOT NULL DEFAULT false,
  otp_verified_at timestamptz,
  kyc_completed boolean NOT NULL DEFAULT false,
  kyc_completed_at timestamptz,
  became_seller boolean NOT NULL DEFAULT false,
  became_seller_at timestamptz,
  first_order_placed boolean NOT NULL DEFAULT false,
  first_order_placed_at timestamptz,
  payment_completed boolean NOT NULL DEFAULT false,
  payment_completed_at timestamptz,
  reward_released boolean NOT NULL DEFAULT false,
  reward_released_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rp_select_own_or_admin" ON public.referral_progress
  FOR SELECT TO authenticated
  USING (
    public.is_admin_user(auth.uid())
    OR EXISTS (SELECT 1 FROM public.referrals r WHERE r.id = referral_id
               AND (r.referrer_user_id = auth.uid() OR r.referred_user_id = auth.uid()))
  );
CREATE POLICY "rp_admin_write" ON public.referral_progress
  FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

-- 4) referral_rewards
CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  trigger text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','locked','approved','rejected')),
  released_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rewards_user ON public.referral_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_rewards_referral ON public.referral_rewards(referral_id);
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rr_select_own_or_admin" ON public.referral_rewards
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_user(auth.uid()));
CREATE POLICY "rr_admin_write" ON public.referral_rewards
  FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

-- 5) referral_campaigns
CREATE TABLE IF NOT EXISTS public.referral_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'customer' CHECK (kind IN ('customer','vendor')),
  is_active boolean NOT NULL DEFAULT true,
  reward_amount numeric NOT NULL DEFAULT 0,
  release_trigger text NOT NULL DEFAULT 'first_order_placed',
  min_order_value numeric DEFAULT 0,
  max_per_user integer DEFAULT 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rcamp_public_view_active" ON public.referral_campaigns
  FOR SELECT TO authenticated
  USING (is_active = true OR public.is_admin_user(auth.uid()));
CREATE POLICY "rcamp_admin_write" ON public.referral_campaigns
  FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

-- 6) referral_settings (single row keyed by id=1)
CREATE TABLE IF NOT EXISTS public.referral_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  default_customer_reward numeric NOT NULL DEFAULT 50,
  default_vendor_reward numeric NOT NULL DEFAULT 200,
  fraud_max_per_device integer NOT NULL DEFAULT 3,
  fraud_max_per_ip integer NOT NULL DEFAULT 5,
  terms_text text DEFAULT 'Rewards are released after the referred user completes admin-defined milestones. Self-referrals and duplicate device/IP signups will be locked for review.',
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.referral_settings (id) VALUES (1) ON CONFLICT DO NOTHING;
ALTER TABLE public.referral_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rset_public_read" ON public.referral_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "rset_admin_write" ON public.referral_settings
  FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

-- Updated-at triggers
CREATE TRIGGER trg_referrals_updated BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_referral_progress_updated BEFORE UPDATE ON public.referral_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_referral_rewards_updated BEFORE UPDATE ON public.referral_rewards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_referral_campaigns_updated BEFORE UPDATE ON public.referral_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Helpers & RPCs
-- =========================================================

-- Random short code generator
CREATE OR REPLACE FUNCTION public.generate_referral_code(_prefix text DEFAULT 'REF')
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  _code text;
  _i int;
BEGIN
  LOOP
    _code := _prefix || '-';
    FOR _i IN 1..6 LOOP
      _code := _code || substr(_chars, 1 + floor(random()*length(_chars))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.referral_codes WHERE code = _code);
  END LOOP;
  RETURN _code;
END;
$$;

-- Ensure code exists for current user
CREATE OR REPLACE FUNCTION public.ensure_my_referral_code(_kind text DEFAULT 'customer')
RETURNS public.referral_codes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.referral_codes;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Login required'; END IF;
  SELECT * INTO _row FROM public.referral_codes WHERE user_id = _uid;
  IF _row.id IS NOT NULL THEN RETURN _row; END IF;
  INSERT INTO public.referral_codes (user_id, code, kind)
  VALUES (_uid, public.generate_referral_code(CASE WHEN _kind='vendor' THEN 'VEN' ELSE 'REF' END), _kind)
  ON CONFLICT (user_id) DO UPDATE SET code = EXCLUDED.code
  RETURNING * INTO _row;
  RETURN _row;
END;
$$;

-- Apply a referral code for the current (referred) user
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

  INSERT INTO public.referrals (referrer_user_id, referred_user_id, kind, status, device_fingerprint, ip_address)
  VALUES (_ref.user_id, _uid, _kind, _status, _device, _ip)
  ON CONFLICT (referrer_user_id, referred_user_id) DO UPDATE SET updated_at = now()
  RETURNING id INTO _ref_id;

  INSERT INTO public.referral_progress (referral_id, installed, installed_at, registered, registered_at)
  VALUES (_ref_id, true, now(), true, now())
  ON CONFLICT (referral_id) DO UPDATE SET registered = true, registered_at = COALESCE(public.referral_progress.registered_at, now());

  RETURN jsonb_build_object('ok', true, 'referral_id', _ref_id, 'status', _status);
END;
$$;

-- Mark a checkpoint for a referred user
CREATE OR REPLACE FUNCTION public.mark_referral_checkpoint(_referred_user_id uuid, _checkpoint text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ref_id uuid;
  _referrer uuid;
  _camp public.referral_campaigns;
BEGIN
  SELECT id, referrer_user_id INTO _ref_id, _referrer
    FROM public.referrals WHERE referred_user_id = _referred_user_id
    ORDER BY created_at ASC LIMIT 1;
  IF _ref_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_referral'); END IF;

  IF _checkpoint = 'otp_verified' THEN
    UPDATE public.referral_progress SET otp_verified = true, otp_verified_at = COALESCE(otp_verified_at, now()) WHERE referral_id = _ref_id;
  ELSIF _checkpoint = 'kyc_completed' THEN
    UPDATE public.referral_progress SET kyc_completed = true, kyc_completed_at = COALESCE(kyc_completed_at, now()) WHERE referral_id = _ref_id;
  ELSIF _checkpoint = 'became_seller' THEN
    UPDATE public.referral_progress SET became_seller = true, became_seller_at = COALESCE(became_seller_at, now()) WHERE referral_id = _ref_id;
  ELSIF _checkpoint = 'first_order_placed' THEN
    UPDATE public.referral_progress SET first_order_placed = true, first_order_placed_at = COALESCE(first_order_placed_at, now()) WHERE referral_id = _ref_id;
  ELSIF _checkpoint = 'payment_completed' THEN
    UPDATE public.referral_progress SET payment_completed = true, payment_completed_at = COALESCE(payment_completed_at, now()) WHERE referral_id = _ref_id;
  END IF;

  -- Auto-release reward when matching campaign trigger satisfied
  FOR _camp IN
    SELECT * FROM public.referral_campaigns
     WHERE is_active = true AND release_trigger = _checkpoint
       AND (starts_at IS NULL OR starts_at <= now())
       AND (ends_at IS NULL OR ends_at >= now())
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.referral_rewards WHERE referral_id = _ref_id AND trigger = _checkpoint) THEN
      INSERT INTO public.referral_rewards (referral_id, user_id, amount, trigger, status)
      VALUES (_ref_id, _referrer, _camp.reward_amount, _checkpoint, 'pending');
      UPDATE public.referral_progress SET reward_released = true, reward_released_at = now() WHERE referral_id = _ref_id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'referral_id', _ref_id);
END;
$$;

-- Customer-facing overview
CREATE OR REPLACE FUNCTION public.get_my_referral_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _code public.referral_codes;
  _result jsonb;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Login required'; END IF;
  SELECT * INTO _code FROM public.referral_codes WHERE user_id = _uid;
  IF _code.id IS NULL THEN
    SELECT * INTO _code FROM public.ensure_my_referral_code('customer');
  END IF;

  SELECT jsonb_build_object(
    'code', _code.code,
    'kind', _code.kind,
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
        )
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

-- Auto-create referral_codes when customer/vendor row created
CREATE OR REPLACE FUNCTION public.handle_new_profile_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _kind text := TG_ARGV[0];
  _prefix text := CASE WHEN _kind = 'vendor' THEN 'VEN' ELSE 'REF' END;
BEGIN
  INSERT INTO public.referral_codes (user_id, code, kind)
  VALUES (NEW.user_id, public.generate_referral_code(_prefix), _kind)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_customer_referral_code
  AFTER INSERT ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile_referral_code('customer');

CREATE TRIGGER trg_vendor_referral_code
  AFTER INSERT ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile_referral_code('vendor');

-- Backfill codes for existing users
INSERT INTO public.referral_codes (user_id, code, kind)
SELECT c.user_id, public.generate_referral_code('REF'), 'customer'
  FROM public.customers c
 WHERE NOT EXISTS (SELECT 1 FROM public.referral_codes rc WHERE rc.user_id = c.user_id)
ON CONFLICT DO NOTHING;

INSERT INTO public.referral_codes (user_id, code, kind)
SELECT v.user_id, public.generate_referral_code('VEN'), 'vendor'
  FROM public.vendors v
 WHERE NOT EXISTS (SELECT 1 FROM public.referral_codes rc WHERE rc.user_id = v.user_id)
ON CONFLICT DO NOTHING;

-- Seed a default active campaign so admin sees something immediately
INSERT INTO public.referral_campaigns (name, kind, is_active, reward_amount, release_trigger, max_per_user)
SELECT 'Default Customer — First Order', 'customer', true, 50, 'first_order_placed', 0
WHERE NOT EXISTS (SELECT 1 FROM public.referral_campaigns WHERE kind = 'customer');

INSERT INTO public.referral_campaigns (name, kind, is_active, reward_amount, release_trigger, max_per_user)
SELECT 'Default Vendor — KYC Approved', 'vendor', true, 200, 'kyc_completed', 0
WHERE NOT EXISTS (SELECT 1 FROM public.referral_campaigns WHERE kind = 'vendor');
