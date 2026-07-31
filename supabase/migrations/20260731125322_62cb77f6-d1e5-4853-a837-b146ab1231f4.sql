
CREATE TABLE IF NOT EXISTS public.referral_scan_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name text,
  owner_name text,
  phone text,
  whatsapp text,
  address text,
  city text,
  category_hint text,
  thumbnail text,
  extracted jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  shared_at timestamptz,
  joined_at timestamptz,
  join_mode text CHECK (join_mode IN ('whatsapp','manual')),
  reward_points integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.referral_scan_leads TO authenticated;
GRANT ALL ON public.referral_scan_leads TO service_role;

ALTER TABLE public.referral_scan_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners manage their own collected cards"
  ON public.referral_scan_leads FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS referral_scan_leads_user_idx ON public.referral_scan_leads (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS referral_scan_leads_phone_idx ON public.referral_scan_leads (phone);

CREATE OR REPLACE FUNCTION public.touch_referral_scan_leads()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_touch_referral_scan_leads ON public.referral_scan_leads;
CREATE TRIGGER trg_touch_referral_scan_leads
  BEFORE UPDATE ON public.referral_scan_leads
  FOR EACH ROW EXECUTE FUNCTION public.touch_referral_scan_leads();

CREATE OR REPLACE FUNCTION public.sync_scan_lead_join(_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead public.referral_scan_leads;
  v_phone text;
  v_found boolean := false;
  v_mode text;
  v_points integer;
BEGIN
  SELECT * INTO v_lead FROM public.referral_scan_leads
   WHERE id = _lead_id AND user_id = auth.uid();
  IF v_lead.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;
  IF v_lead.joined_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'joined', true, 'reward_points', v_lead.reward_points);
  END IF;

  v_phone := right(regexp_replace(coalesce(v_lead.phone, v_lead.whatsapp, ''), '\D', '', 'g'), 10);
  IF length(v_phone) < 10 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_phone');
  END IF;

  SELECT true INTO v_found FROM public.vendors
   WHERE right(regexp_replace(coalesce(whatsapp,''), '\D', '', 'g'), 10) = v_phone
   LIMIT 1;

  IF NOT coalesce(v_found, false) THEN
    RETURN jsonb_build_object('ok', true, 'joined', false);
  END IF;

  v_mode := CASE WHEN v_lead.shared_at IS NOT NULL THEN 'whatsapp' ELSE 'manual' END;
  v_points := v_lead.reward_points + CASE WHEN v_mode = 'whatsapp' THEN 20 ELSE 10 END;

  UPDATE public.referral_scan_leads
     SET joined_at = now(), join_mode = v_mode, reward_points = v_points
   WHERE id = _lead_id;

  RETURN jsonb_build_object('ok', true, 'joined', true, 'join_mode', v_mode, 'reward_points', v_points);
END; $$;

REVOKE ALL ON FUNCTION public.sync_scan_lead_join(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.sync_scan_lead_join(uuid) TO authenticated;
