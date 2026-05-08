
-- OTP codes table
CREATE TABLE public.otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  attempts integer NOT NULL DEFAULT 0,
  verified_at timestamptz,
  provider text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_otp_codes_phone ON public.otp_codes (phone, created_at DESC);
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;
-- No client policies; only service role accesses via server functions.

-- System logs table
CREATE TABLE public.system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,                -- 'sms' | 'payment' | 'otp'
  provider text,                     -- 'fast2sms' | 'msg91' | 'razorpay' | 'cashfree'
  status text NOT NULL,              -- 'success' | 'error'
  message text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_system_logs_created ON public.system_logs (created_at DESC);
CREATE INDEX idx_system_logs_kind_status ON public.system_logs (kind, status, created_at DESC);
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view system logs" ON public.system_logs FOR SELECT
  TO authenticated USING (public.is_admin_user(auth.uid()));
CREATE POLICY "Super admins delete system logs" ON public.system_logs FOR DELETE
  TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Helper RPC for admins to view gateway health summary
CREATE OR REPLACE FUNCTION public.get_gateway_health()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _result jsonb;
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT jsonb_build_object(
    'sms', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'provider', g.provider,
        'display_name', g.display_name,
        'is_active', g.is_active,
        'is_test_mode', g.is_test_mode,
        'last_error', (SELECT message FROM system_logs WHERE kind='sms' AND provider=g.provider AND status='error' ORDER BY created_at DESC LIMIT 1),
        'last_error_at', (SELECT created_at FROM system_logs WHERE kind='sms' AND provider=g.provider AND status='error' ORDER BY created_at DESC LIMIT 1),
        'last_success_at', (SELECT created_at FROM system_logs WHERE kind='sms' AND provider=g.provider AND status='success' ORDER BY created_at DESC LIMIT 1)
      )) FROM sms_gateways g
    ), '[]'::jsonb),
    'payment', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'provider', g.provider,
        'display_name', g.display_name,
        'is_active', g.is_active,
        'is_test_mode', g.is_test_mode,
        'last_error', (SELECT message FROM system_logs WHERE kind='payment' AND provider=g.provider AND status='error' ORDER BY created_at DESC LIMIT 1),
        'last_error_at', (SELECT created_at FROM system_logs WHERE kind='payment' AND provider=g.provider AND status='error' ORDER BY created_at DESC LIMIT 1),
        'last_success_at', (SELECT created_at FROM system_logs WHERE kind='payment' AND provider=g.provider AND status='success' ORDER BY created_at DESC LIMIT 1)
      )) FROM payment_gateways g
    ), '[]'::jsonb),
    'recent_errors', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', l.id, 'kind', l.kind, 'provider', l.provider,
        'message', l.message, 'created_at', l.created_at
      ) ORDER BY l.created_at DESC) FROM (
        SELECT * FROM system_logs WHERE status='error' ORDER BY created_at DESC LIMIT 50
      ) l
    ), '[]'::jsonb)
  ) INTO _result;
  RETURN _result;
END;
$$;

-- Seed Razorpay/Cashfree rows if missing (so admin UI shows them)
INSERT INTO public.payment_gateways (provider, display_name, is_active, is_test_mode, public_key, purpose, priority)
VALUES
  ('razorpay', 'Razorpay', false, true, NULL, 'both', 10),
  ('cashfree', 'Cashfree', false, true, NULL, 'both', 20)
ON CONFLICT (provider) DO NOTHING;

-- Seed MSG91/Fast2SMS rows if missing
INSERT INTO public.sms_gateways (provider, display_name, is_active, is_test_mode, config)
VALUES
  ('fast2sms', 'Fast2SMS', false, true, '{}'::jsonb),
  ('msg91', 'MSG91', false, true, '{}'::jsonb)
ON CONFLICT (provider) DO NOTHING;
