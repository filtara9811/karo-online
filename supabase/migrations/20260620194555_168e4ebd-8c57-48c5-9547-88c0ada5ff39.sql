
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS referral_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS referral_active boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.referral_link_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid,
  code text NOT NULL,
  source text NOT NULL CHECK (source IN ('link','qr','card')),
  fp_hash text,
  ip_hash text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.referral_link_visits TO authenticated;
GRANT INSERT, SELECT ON public.referral_link_visits TO anon;
GRANT ALL ON public.referral_link_visits TO service_role;

ALTER TABLE public.referral_link_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner reads own visits" ON public.referral_link_visits;
CREATE POLICY "owner reads own visits"
  ON public.referral_link_visits FOR SELECT
  TO authenticated
  USING (referrer_user_id = auth.uid() OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "anon may insert via RPC" ON public.referral_link_visits;
CREATE POLICY "anon may insert via RPC"
  ON public.referral_link_visits FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_rlv_referrer_source_time
  ON public.referral_link_visits(referrer_user_id, source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rlv_code_time
  ON public.referral_link_visits(code, created_at DESC);

CREATE OR REPLACE FUNCTION public.log_referral_visit(
  _code text,
  _source text,
  _fp_hash text DEFAULT NULL,
  _ip_hash text DEFAULT NULL,
  _user_agent text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _ref uuid;
BEGIN
  IF _source NOT IN ('link','qr','card') THEN RETURN; END IF;
  SELECT user_id INTO _ref FROM public.customers WHERE referral_code = _code LIMIT 1;
  IF _ref IS NULL THEN
    SELECT user_id INTO _ref FROM public.vendors WHERE referral_code = _code LIMIT 1;
  END IF;
  IF _fp_hash IS NOT NULL AND _ref IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.referral_link_visits
      WHERE referrer_user_id = _ref AND source = _source AND fp_hash = _fp_hash
        AND created_at > now() - interval '24 hours'
    ) THEN RETURN; END IF;
  END IF;
  INSERT INTO public.referral_link_visits (referrer_user_id, code, source, fp_hash, ip_hash, user_agent)
  VALUES (_ref, _code, _source, _fp_hash, _ip_hash, _user_agent);
END $$;
GRANT EXECUTE ON FUNCTION public.log_referral_visit(text, text, text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_referral_traffic_counts()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _link int := 0; _qr int := 0; _card int := 0; _refs int := 0;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('link',0,'qr',0,'card',0,'referrals',0); END IF;
  SELECT COUNT(*) INTO _link FROM public.referral_link_visits WHERE referrer_user_id = _uid AND source='link';
  SELECT COUNT(*) INTO _qr   FROM public.referral_link_visits WHERE referrer_user_id = _uid AND source='qr';
  SELECT COUNT(*) INTO _card FROM public.referral_link_visits WHERE referrer_user_id = _uid AND source='card';
  SELECT COUNT(*) INTO _refs FROM public.referrals WHERE referrer_user_id = _uid;
  RETURN jsonb_build_object('link', _link, 'qr', _qr, 'card', _card, 'referrals', _refs);
END $$;
GRANT EXECUTE ON FUNCTION public.get_referral_traffic_counts() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_referral_visits(_source text, _limit int DEFAULT 50)
RETURNS TABLE(id uuid, code text, source text, user_agent text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, code, source, user_agent, created_at
    FROM public.referral_link_visits
   WHERE referrer_user_id = auth.uid()
     AND (_source = 'all' OR source = _source)
   ORDER BY created_at DESC
   LIMIT GREATEST(1, LEAST(_limit, 200));
$$;
GRANT EXECUTE ON FUNCTION public.get_referral_visits(text, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_toggle_referral_active(_user_id uuid, _active boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  UPDATE public.customers SET referral_active = _active, updated_at = now() WHERE user_id = _user_id;
  UPDATE public.vendors   SET referral_active = _active, updated_at = now() WHERE user_id = _user_id;
  RETURN jsonb_build_object('ok', true, 'user_id', _user_id, 'active', _active);
END $$;
GRANT EXECUTE ON FUNCTION public.admin_toggle_referral_active(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.block_reward_if_paused()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _active boolean := true;
BEGIN
  SELECT COALESCE(c.referral_active, true) INTO _active
    FROM public.customers c WHERE c.user_id = NEW.user_id LIMIT 1;
  IF _active IS NULL OR _active = true THEN
    SELECT COALESCE(v.referral_active, true) INTO _active
      FROM public.vendors v WHERE v.user_id = NEW.user_id LIMIT 1;
  END IF;
  IF _active = false THEN RETURN NULL; END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_block_reward_if_paused ON public.referral_rewards;
CREATE TRIGGER trg_block_reward_if_paused
  BEFORE INSERT ON public.referral_rewards
  FOR EACH ROW EXECUTE FUNCTION public.block_reward_if_paused();
