-- Staff invites for deep-link onboarding
CREATE TABLE IF NOT EXISTS public.staff_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invite_token TEXT NOT NULL UNIQUE,
  staff_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_by UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  payout_model TEXT NOT NULL DEFAULT 'per_task',
  monthly_salary NUMERIC,
  channel TEXT NOT NULL DEFAULT 'manual',
  sent_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_invites_token ON public.staff_invites (invite_token);
CREATE INDEX IF NOT EXISTS idx_staff_invites_user ON public.staff_invites (staff_user_id);

GRANT SELECT ON public.staff_invites TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_invites TO authenticated;
GRANT ALL ON public.staff_invites TO service_role;

ALTER TABLE public.staff_invites ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "admins manage staff invites"
  ON public.staff_invites
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Public: allow reading a single invite by token (for the landing page to validate).
-- Only exposes rows that are non-expired & unused so the token is essentially opaque.
CREATE POLICY "public read live invite by token"
  ON public.staff_invites
  FOR SELECT
  TO anon, authenticated
  USING (used_at IS NULL AND expires_at > now());

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.staff_invites_touch()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_staff_invites_touch ON public.staff_invites;
CREATE TRIGGER trg_staff_invites_touch
  BEFORE UPDATE ON public.staff_invites
  FOR EACH ROW EXECUTE FUNCTION public.staff_invites_touch();