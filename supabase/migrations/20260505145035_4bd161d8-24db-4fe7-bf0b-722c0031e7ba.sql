-- SMS Gateways table (same pattern as payment_gateways)
CREATE TABLE public.sms_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL UNIQUE,
  display_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  is_test_mode boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.sms_gateways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view sms gateways"
  ON public.sms_gateways FOR SELECT TO authenticated
  USING (is_admin_user(auth.uid()));

CREATE POLICY "Super admins insert sms gateways"
  ON public.sms_gateways FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins update sms gateways"
  ON public.sms_gateways FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins delete sms gateways"
  ON public.sms_gateways FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Ensure only ONE provider can be active at a time
CREATE OR REPLACE FUNCTION public.enforce_single_active_sms_gateway()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE public.sms_gateways SET is_active = false
    WHERE id <> NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_single_active_sms_gateway
  BEFORE INSERT OR UPDATE OF is_active ON public.sms_gateways
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_active_sms_gateway();

-- Seed both providers
INSERT INTO public.sms_gateways (provider, display_name, config) VALUES
  ('msg91', 'MSG91', '{"auth_key":"","sender_id":"","template_id":"","route":"4","country":"91"}'::jsonb),
  ('fast2sms', 'Fast2SMS', '{"api_key":"","sender_id":"FSTSMS","route":"otp"}'::jsonb)
ON CONFLICT (provider) DO NOTHING;