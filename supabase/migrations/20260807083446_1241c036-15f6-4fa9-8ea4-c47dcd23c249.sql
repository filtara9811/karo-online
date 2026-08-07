CREATE TABLE IF NOT EXISTS public.qr_projects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  slug text NOT NULL,
  theme_key text NOT NULL DEFAULT 'classic-amber',
  accent_color text,
  links jsonb NOT NULL DEFAULT '[]'::jsonb,
  ads_enabled boolean NOT NULL DEFAULT false,
  ad_budget_inr integer NOT NULL DEFAULT 0,
  ad_clicks integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, slug)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.qr_projects TO authenticated;
GRANT SELECT ON public.qr_projects TO anon;
GRANT ALL ON public.qr_projects TO service_role;

ALTER TABLE public.qr_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their qr projects"
  ON public.qr_projects FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can read qr project appearance"
  ON public.qr_projects FOR SELECT TO anon USING (true);

CREATE OR REPLACE FUNCTION public.qr_projects_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS qr_projects_touch_trg ON public.qr_projects;
CREATE TRIGGER qr_projects_touch_trg BEFORE UPDATE ON public.qr_projects
FOR EACH ROW EXECUTE FUNCTION public.qr_projects_touch();

ALTER TABLE public.referral_link_visits ADD COLUMN IF NOT EXISTS project_slug text;

CREATE OR REPLACE FUNCTION public.log_referral_visit_lead(_code text, _source text, _name text, _phone text, _fp_hash text DEFAULT NULL::text, _user_agent text DEFAULT NULL::text, _project text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _ref uuid; _p10 text; _nm text;
BEGIN
  IF _source NOT IN ('link','qr','card') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'bad_source');
  END IF;
  _p10 := regexp_replace(coalesce(_phone, ''), '\D', '', 'g');
  IF length(_p10) < 10 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'bad_phone');
  END IF;
  _p10 := right(_p10, 10);
  _nm := nullif(btrim(coalesce(_name, '')), '');
  IF _nm IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'bad_name');
  END IF;

  SELECT user_id INTO _ref FROM public.referral_codes
   WHERE upper(code) = upper(btrim(_code)) LIMIT 1;

  INSERT INTO public.referral_link_visits
    (referrer_user_id, code, source, fp_hash, user_agent, visitor_name, visitor_phone, project_slug)
  VALUES (_ref, btrim(_code), _source, _fp_hash, _user_agent, left(_nm, 80), _p10, nullif(btrim(coalesce(_project,'')), ''));

  RETURN jsonb_build_object('ok', true);
END $function$;

DROP FUNCTION IF EXISTS public.get_referral_visits(text, integer);

CREATE OR REPLACE FUNCTION public.get_referral_visits(_source text, _limit integer DEFAULT 50)
 RETURNS TABLE(id uuid, code text, source text, user_agent text, created_at timestamp with time zone, visitor_name text, visitor_phone text, project_slug text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id, code, source, user_agent, created_at, visitor_name, visitor_phone, project_slug
    FROM public.referral_link_visits
   WHERE referrer_user_id = auth.uid()
     AND (_source = 'all' OR source = _source)
   ORDER BY created_at DESC
   LIMIT GREATEST(1, LEAST(_limit, 200));
$function$;