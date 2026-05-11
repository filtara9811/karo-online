CREATE TABLE IF NOT EXISTS public.whatsapp_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  api_base_url text,
  phone_number_id text,
  business_account_id text,
  app_id text,
  access_token text,
  webhook_verify_token text,
  app_secret text,
  default_template text,
  template_namespace text,
  assigned_use text NOT NULL DEFAULT 'none',
  quality_rating text,
  is_active boolean NOT NULL DEFAULT false,
  is_test_mode boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_providers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'whatsapp_providers'
      AND policyname = 'Admins manage whatsapp_providers'
  ) THEN
    CREATE POLICY "Admins manage whatsapp_providers"
      ON public.whatsapp_providers
      FOR ALL
      TO authenticated
      USING (public.is_admin_user(auth.uid()))
      WITH CHECK (public.is_admin_user(auth.uid()));
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_whatsapp_providers_updated ON public.whatsapp_providers;
CREATE TRIGGER trg_whatsapp_providers_updated
  BEFORE UPDATE ON public.whatsapp_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.whatsapp_providers (
  provider,
  display_name,
  description,
  api_base_url,
  assigned_use,
  priority,
  config
) VALUES
  (
    'fast2sms_meta',
    'Fast2SMS Meta WhatsApp',
    'Fast2SMS se Meta WhatsApp Business API messages, templates aur alerts',
    'https://www.fast2sms.com/dev/whatsapp',
    'transactional',
    1,
    '{"templates":[{"event":"referral_joined","template_name":"referral_joined","language":"hi"},{"event":"order_update","template_name":"order_update","language":"hi"}]}'::jsonb
  ),
  (
    'meta_cloud',
    'Meta WhatsApp Cloud API',
    'Direct Meta Cloud API fallback for WhatsApp Business messages',
    'https://graph.facebook.com/v20.0',
    'fallback',
    2,
    '{"templates":[{"event":"otp","template_name":"otp_login","language":"en_US"}]}'::jsonb
  )
ON CONFLICT (provider) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  api_base_url = COALESCE(public.whatsapp_providers.api_base_url, EXCLUDED.api_base_url),
  assigned_use = COALESCE(NULLIF(public.whatsapp_providers.assigned_use, 'none'), EXCLUDED.assigned_use),
  priority = EXCLUDED.priority,
  config = CASE
    WHEN public.whatsapp_providers.config = '{}'::jsonb THEN EXCLUDED.config
    ELSE public.whatsapp_providers.config
  END;