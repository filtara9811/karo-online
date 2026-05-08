-- New integrations hub table (does NOT touch existing tables)
CREATE TABLE IF NOT EXISTS public.integration_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key text NOT NULL UNIQUE,
  category text NOT NULL,
  display_name text NOT NULL,
  description text,
  is_enabled boolean NOT NULL DEFAULT false,
  is_configured boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.integration_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage integration modules"
  ON public.integration_modules
  FOR ALL
  TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE TRIGGER trg_integration_modules_updated_at
  BEFORE UPDATE ON public.integration_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the 10 module categories from the user's extension plan
INSERT INTO public.integration_modules (module_key, category, display_name, description) VALUES
  ('firebase',         'auth_push',  'Firebase',                'Auth, FCM Push, Analytics, Crash reporting'),
  ('kyc',              'kyc',        'Advanced KYC',            'Cashfree / Surepass / Signzy / Decentro — Aadhaar, PAN, GST, Bank, Face match'),
  ('maps',             'maps',       'Maps & Geo',              'Google Maps + Mappls India + OSM — tracking, geofence, hyperlocal'),
  ('whatsapp_cloud',   'messaging',  'WhatsApp Cloud API',      'Meta WABA — templates, OTP, campaigns, bulk'),
  ('analytics_plus',   'analytics',  'Advanced Analytics',      'Funnel, retention, heatmaps, live visitors, revenue forecast'),
  ('customer_crm',     'crm',        'Customer CRM',            'Tags, VIP, fraud score, engagement, behaviour intel'),
  ('vendor_plus',      'vendor',     'Vendor Management+',      'KYC, trust score, payouts, subscription, featured'),
  ('automation_cron',  'automation', 'Automation & Cron',       'Retry OTP/payments/webhooks, reminders, daily reports'),
  ('security_plus',    'security',   'Security Extensions',     '2FA, RBAC, audit logs, IP restrictions, encryption'),
  ('ai_extensions',    'ai',         'AI Extensions',           'OpenAI chatbot, fraud detection, recommendations, insights')
ON CONFLICT (module_key) DO NOTHING;