ALTER TABLE public.referral_settings
  ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS influencer_activation_fee NUMERIC NOT NULL DEFAULT 499,
  ADD COLUMN IF NOT EXISTS banner_images JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS partner_kind TEXT NOT NULL DEFAULT 'vendor';

CREATE OR REPLACE FUNCTION public.referral_settings_track_pause()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    IF NEW.is_active = false THEN
      NEW.paused_at := now();
    ELSE
      NEW.paused_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_referral_settings_pause ON public.referral_settings;
CREATE TRIGGER trg_referral_settings_pause
  BEFORE UPDATE ON public.referral_settings
  FOR EACH ROW EXECUTE FUNCTION public.referral_settings_track_pause();

DROP FUNCTION IF EXISTS public.release_referral_reward(UUID);

CREATE OR REPLACE FUNCTION public.release_referral_reward(_vendor_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings public.referral_settings%ROWTYPE;
  v_ref RECORD;
  v_base NUMERIC;
  v_l1_pct NUMERIC;
  v_l2_pct NUMERIC;
  v_l1_amount NUMERIC;
  v_l2_amount NUMERIC;
  v_bonus_pct NUMERIC := 0;
  v_bonus_amount NUMERIC := 0;
  v_direct_recruits INTEGER := 0;
  v_released JSONB := '[]'::jsonb;
BEGIN
  SELECT * INTO v_settings FROM public.referral_settings ORDER BY id LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_settings');
  END IF;

  SELECT r.* INTO v_ref
  FROM public.referrals r
  WHERE r.referred_user_id = _vendor_user_id
  ORDER BY r.created_at ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_referral');
  END IF;

  IF v_settings.is_active = false THEN
    IF v_settings.paused_at IS NULL OR v_ref.created_at >= v_settings.paused_at THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'campaign_paused');
    END IF;
  END IF;

  v_base   := COALESCE(v_settings.base_reward_amount, 200);
  v_l1_pct := COALESCE(v_settings.level_1_pct, 70);
  v_l2_pct := COALESCE(v_settings.level_2_pct, 30);

  IF v_ref.referrer_user_id IS NOT NULL THEN
    SELECT COUNT(*)::INTEGER INTO v_direct_recruits
    FROM public.referrals
    WHERE referrer_user_id = v_ref.referrer_user_id
      AND status IN ('approved','locked');

    IF v_settings.royalty_tiers IS NOT NULL THEN
      SELECT (t->>'bonus_pct')::NUMERIC INTO v_bonus_pct
      FROM jsonb_array_elements(v_settings.royalty_tiers) t
      WHERE (t->>'min_recruits')::INTEGER <= v_direct_recruits
      ORDER BY (t->>'min_recruits')::INTEGER DESC
      LIMIT 1;
      v_bonus_pct := COALESCE(v_bonus_pct, 0);
    END IF;
  END IF;

  v_l1_amount := round(v_base * v_l1_pct / 100.0, 2);
  v_l2_amount := round(v_base * v_l2_pct / 100.0, 2);
  v_bonus_amount := round(v_base * v_bonus_pct / 100.0, 2);

  IF v_ref.referrer_user_id IS NOT NULL THEN
    INSERT INTO public.referral_rewards
      (referral_id, beneficiary_user_id, amount, level, pct_applied, status, released_at)
    VALUES
      (v_ref.id, v_ref.referrer_user_id, v_l1_amount + v_bonus_amount, 1,
       v_l1_pct + v_bonus_pct, 'released', now())
    ON CONFLICT DO NOTHING;
    v_released := v_released || jsonb_build_object(
      'level', 1, 'user_id', v_ref.referrer_user_id,
      'amount', v_l1_amount + v_bonus_amount, 'bonus_pct', v_bonus_pct);
  END IF;

  IF v_ref.level_2_user_id IS NOT NULL AND v_l2_amount > 0 THEN
    INSERT INTO public.referral_rewards
      (referral_id, beneficiary_user_id, amount, level, pct_applied, status, released_at)
    VALUES
      (v_ref.id, v_ref.level_2_user_id, v_l2_amount, 2, v_l2_pct, 'released', now())
    ON CONFLICT DO NOTHING;
    v_released := v_released || jsonb_build_object(
      'level', 2, 'user_id', v_ref.level_2_user_id, 'amount', v_l2_amount);
  END IF;

  UPDATE public.referrals SET status = 'approved' WHERE id = v_ref.id AND status <> 'approved';

  RETURN jsonb_build_object('ok', true, 'released', v_released,
    'direct_recruits', v_direct_recruits, 'bonus_pct', v_bonus_pct);
END;
$$;

GRANT EXECUTE ON FUNCTION public.release_referral_reward(UUID) TO authenticated, service_role;