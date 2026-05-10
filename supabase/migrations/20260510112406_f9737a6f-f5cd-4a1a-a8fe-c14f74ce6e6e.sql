
-- Banners managed by admin for customer referral screen
CREATE TABLE IF NOT EXISTS public.referral_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  subtitle text,
  image_url text,
  cta_label text,
  cta_link text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rb_view_active" ON public.referral_banners
  FOR SELECT TO authenticated
  USING (is_active = true OR public.is_admin_user(auth.uid()));

CREATE POLICY "rb_admin_all" ON public.referral_banners
  FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE TRIGGER trg_referral_banners_updated
  BEFORE UPDATE ON public.referral_banners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Admin overview
CREATE OR REPLACE FUNCTION public.admin_get_referral_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _r jsonb;
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT jsonb_build_object(
    'totals', jsonb_build_object(
      'invited',     (SELECT count(*) FROM public.referrals),
      'successful',  (SELECT count(*) FROM public.referrals WHERE status='approved'),
      'pending',     (SELECT count(*) FROM public.referrals WHERE status IN ('pending','locked')),
      'rejected',    (SELECT count(*) FROM public.referrals WHERE status='rejected'),
      'rewards_pending',  COALESCE((SELECT sum(amount) FROM public.referral_rewards WHERE status IN ('pending','locked')),0),
      'rewards_approved', COALESCE((SELECT sum(amount) FROM public.referral_rewards WHERE status='approved'),0),
      'rewards_rejected', COALESCE((SELECT sum(amount) FROM public.referral_rewards WHERE status='rejected'),0)
    ),
    'top_referrers', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'user_id', t.user_id,
        'name', c.name,
        'phone', c.phone,
        'avatar_url', c.avatar_url,
        'total', t.total,
        'successful', t.successful,
        'earnings', COALESCE((SELECT sum(amount) FROM public.referral_rewards WHERE user_id=t.user_id AND status='approved'),0)
      ) ORDER BY t.successful DESC, t.total DESC)
      FROM (
        SELECT referrer_user_id AS user_id,
               count(*) AS total,
               count(*) FILTER (WHERE status='approved') AS successful
          FROM public.referrals
         GROUP BY referrer_user_id
         ORDER BY successful DESC, total DESC
         LIMIT 25
      ) t
      LEFT JOIN public.customers c ON c.user_id = t.user_id
    ), '[]'::jsonb),
    'recent', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', r.id,
        'created_at', r.created_at,
        'status', r.status,
        'kind', r.kind,
        'referrer', jsonb_build_object('user_id', r.referrer_user_id, 'name', cr.name, 'phone', cr.phone),
        'referred', jsonb_build_object('user_id', r.referred_user_id, 'name', cd.name, 'phone', cd.phone)
      ) ORDER BY r.created_at DESC)
      FROM (SELECT * FROM public.referrals ORDER BY created_at DESC LIMIT 50) r
      LEFT JOIN public.customers cr ON cr.user_id = r.referrer_user_id
      LEFT JOIN public.customers cd ON cd.user_id = r.referred_user_id
    ), '[]'::jsonb),
    'rewards_queue', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', rw.id,
        'amount', rw.amount,
        'status', rw.status,
        'trigger', rw.trigger,
        'created_at', rw.created_at,
        'user_id', rw.user_id,
        'name', c.name,
        'phone', c.phone,
        'referral_id', rw.referral_id
      ) ORDER BY rw.created_at DESC)
      FROM (SELECT * FROM public.referral_rewards ORDER BY created_at DESC LIMIT 100) rw
      LEFT JOIN public.customers c ON c.user_id = rw.user_id
    ), '[]'::jsonb)
  ) INTO _r;
  RETURN _r;
END;
$$;

-- Approve a reward (and credit vendor wallet if vendor)
CREATE OR REPLACE FUNCTION public.admin_approve_referral_reward(_reward_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rw public.referral_rewards;
  _is_vendor boolean;
  _bal bigint;
  _paise bigint;
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO _rw FROM public.referral_rewards WHERE id = _reward_id FOR UPDATE;
  IF _rw.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;
  IF _rw.status = 'approved' THEN
    RETURN jsonb_build_object('ok', true, 'already', true);
  END IF;

  UPDATE public.referral_rewards
     SET status='approved', released_at = now(), updated_at = now()
   WHERE id = _reward_id;

  -- If recipient is a vendor, credit their service wallet (in paise)
  SELECT EXISTS(SELECT 1 FROM public.vendors WHERE user_id = _rw.user_id) INTO _is_vendor;
  IF _is_vendor THEN
    _paise := (_rw.amount * 100)::bigint;
    INSERT INTO public.vendor_wallets (vendor_id, service_balance_paise)
      VALUES (_rw.user_id, 0)
      ON CONFLICT DO NOTHING;
    UPDATE public.vendor_wallets
       SET service_balance_paise = service_balance_paise + _paise,
           updated_at = now()
     WHERE vendor_id = _rw.user_id
     RETURNING service_balance_paise INTO _bal;
    INSERT INTO public.wallet_transactions
      (vendor_id, wallet_kind, txn_type, direction, amount_paise, status, description, reference_id, balance_after_paise)
    VALUES
      (_rw.user_id, 'service', 'referral_reward', 'credit', _paise, 'success',
       'Referral reward approved', _reward_id::text, _bal);
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_referral_reward(_reward_id uuid, _notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.referral_rewards
     SET status='rejected', notes = COALESCE(_notes, notes), updated_at = now()
   WHERE id = _reward_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_upsert_referral_campaign(
  _id uuid,
  _name text,
  _kind text,
  _is_active boolean,
  _reward_amount numeric,
  _release_trigger text,
  _min_order_value numeric,
  _max_per_user int,
  _starts_at timestamptz,
  _ends_at timestamptz
) RETURNS public.referral_campaigns
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _row public.referral_campaigns;
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF _id IS NULL THEN
    INSERT INTO public.referral_campaigns
      (name, kind, is_active, reward_amount, release_trigger, min_order_value, max_per_user, starts_at, ends_at)
    VALUES (_name, _kind, _is_active, _reward_amount, _release_trigger, _min_order_value, _max_per_user, _starts_at, _ends_at)
    RETURNING * INTO _row;
  ELSE
    UPDATE public.referral_campaigns
       SET name=_name, kind=_kind, is_active=_is_active,
           reward_amount=_reward_amount, release_trigger=_release_trigger,
           min_order_value=_min_order_value, max_per_user=_max_per_user,
           starts_at=_starts_at, ends_at=_ends_at, updated_at=now()
     WHERE id=_id
     RETURNING * INTO _row;
  END IF;
  RETURN _row;
END;
$$;
