
-- 1. device_fingerprints table
CREATE TABLE public.device_fingerprints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fingerprint TEXT NOT NULL,
  phone TEXT NOT NULL,
  panel TEXT NOT NULL CHECK (panel IN ('customer','vendor','staff','admin')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_agent TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unlocked_at TIMESTAMPTZ,
  unlocked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  unlock_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only one active binding per (fingerprint, panel). Once unlocked_at is set, row is "released".
CREATE UNIQUE INDEX device_fingerprints_active_unique
  ON public.device_fingerprints (fingerprint, panel)
  WHERE unlocked_at IS NULL;

CREATE INDEX device_fingerprints_phone_idx ON public.device_fingerprints (phone);
CREATE INDEX device_fingerprints_panel_idx ON public.device_fingerprints (panel);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_fingerprints TO authenticated;
GRANT ALL ON public.device_fingerprints TO service_role;

ALTER TABLE public.device_fingerprints ENABLE ROW LEVEL SECURITY;

-- Helper: is current user an admin/super_admin?
CREATE OR REPLACE FUNCTION public.is_admin_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','super_admin')
  );
$$;

CREATE POLICY "Admins manage all device fingerprints"
  ON public.device_fingerprints FOR ALL
  TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Users can view their own fingerprint"
  ON public.device_fingerprints FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 2. device_unlock_audit
CREATE TABLE public.device_unlock_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  panel TEXT,
  fingerprint TEXT,
  unlocked_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT,
  rows_affected INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.device_unlock_audit TO authenticated;
GRANT ALL ON public.device_unlock_audit TO service_role;

ALTER TABLE public.device_unlock_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view unlock audit"
  ON public.device_unlock_audit FOR SELECT
  TO authenticated
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins insert unlock audit"
  ON public.device_unlock_audit FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_user(auth.uid()) AND unlocked_by = auth.uid());

-- 3. updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER update_device_fingerprints_updated_at
  BEFORE UPDATE ON public.device_fingerprints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
