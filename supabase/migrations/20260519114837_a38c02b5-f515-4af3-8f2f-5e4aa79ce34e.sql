-- Onboarding slides (admin-managed welcome screens shown to customers before login)
CREATE TABLE IF NOT EXISTS public.onboarding_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position int NOT NULL DEFAULT 0,
  title text NOT NULL DEFAULT '',
  subtitle text NOT NULL DEFAULT '',
  media_type text NOT NULL DEFAULT 'image' CHECK (media_type IN ('image','video','lottie','animation')),
  media_url text NOT NULL DEFAULT '',
  poster_url text,
  cta_label text NOT NULL DEFAULT 'Next',
  bg_color text,
  text_color text,
  audience text NOT NULL DEFAULT 'customer' CHECK (audience IN ('customer','vendor','all')),
  is_active boolean NOT NULL DEFAULT true,
  skip_allowed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_slides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Onboarding slides are publicly readable"
  ON public.onboarding_slides FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins read all onboarding slides"
  ON public.onboarding_slides FOR SELECT
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins insert onboarding slides"
  ON public.onboarding_slides FOR INSERT
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins update onboarding slides"
  ON public.onboarding_slides FOR UPDATE
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins delete onboarding slides"
  ON public.onboarding_slides FOR DELETE
  USING (public.is_admin_user(auth.uid()));

CREATE TRIGGER onboarding_slides_touch
  BEFORE UPDATE ON public.onboarding_slides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_onboarding_slides_active_pos
  ON public.onboarding_slides (audience, is_active, position);

-- Profile change audit log (every edit a customer makes is recorded, esp. phone changes)
CREATE TABLE IF NOT EXISTS public.customer_profile_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_user_id uuid NOT NULL,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  changed_by uuid,
  verified_via_otp boolean NOT NULL DEFAULT false,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_profile_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers see their own profile audit"
  ON public.customer_profile_audit FOR SELECT
  USING (auth.uid() = customer_user_id);

CREATE POLICY "Admins see all profile audit"
  ON public.customer_profile_audit FOR SELECT
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Authenticated users insert their own profile audit"
  ON public.customer_profile_audit FOR INSERT
  WITH CHECK (auth.uid() = customer_user_id OR public.is_admin_user(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_profile_audit_user_time
  ON public.customer_profile_audit (customer_user_id, created_at DESC);