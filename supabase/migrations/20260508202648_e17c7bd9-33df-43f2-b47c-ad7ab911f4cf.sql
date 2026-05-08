
-- KYC Providers (admin-managed credentials)
CREATE TABLE public.kyc_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL UNIQUE, -- 'cashfree' | 'surepass' | 'signzy' | 'decentro'
  display_name text NOT NULL,
  client_id text,
  client_secret text,
  api_key text,
  base_url text,
  is_sandbox boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT false,
  supported_checks jsonb NOT NULL DEFAULT '[]'::jsonb, -- ['aadhaar','pan','gst','udyam','bank','selfie','face_match','ocr']
  extra_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.kyc_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kyc_providers_admin_all" ON public.kyc_providers
  FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE TRIGGER trg_kyc_providers_updated
  BEFORE UPDATE ON public.kyc_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- KYC Verifications (audit log of every check)
CREATE TABLE public.kyc_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text NOT NULL, -- 'vendor' | 'customer' | 'staff'
  subject_user_id uuid,        -- references auth.users.id (no FK to keep flexible)
  check_type text NOT NULL,    -- 'aadhaar' | 'pan' | 'gst' | 'udyam' | 'bank' | 'selfie' | 'face_match' | 'ocr'
  method text NOT NULL DEFAULT 'api', -- 'api' | 'manual_upload' | 'physical'
  provider text,               -- which provider handled this
  document_number text,        -- masked/last4 acceptable
  request_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  document_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending', -- 'pending'|'verified'|'failed'|'manual_review'
  reviewer_id uuid,
  reviewer_notes text,
  reference_id text,           -- provider's reference / verification id
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz
);

CREATE INDEX idx_kyc_verifications_subject ON public.kyc_verifications(subject_user_id, check_type);
CREATE INDEX idx_kyc_verifications_status ON public.kyc_verifications(status);

ALTER TABLE public.kyc_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kyc_verifications_admin_all" ON public.kyc_verifications
  FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "kyc_verifications_subject_read" ON public.kyc_verifications
  FOR SELECT TO authenticated
  USING (subject_user_id = auth.uid());

CREATE TRIGGER trg_kyc_verifications_updated
  BEFORE UPDATE ON public.kyc_verifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed Cashfree provider row (admin will fill credentials in UI)
INSERT INTO public.kyc_providers (provider, display_name, base_url, is_sandbox, is_active, supported_checks)
VALUES (
  'cashfree',
  'Cashfree Verification Suite',
  'https://sandbox.cashfree.com/verification',
  true,
  false,
  '["pan","aadhaar","gst","udyam","bank","upi"]'::jsonb
)
ON CONFLICT (provider) DO NOTHING;

INSERT INTO public.kyc_providers (provider, display_name, base_url, is_sandbox, is_active, supported_checks)
VALUES
  ('surepass', 'Surepass', 'https://kyc-api.surepass.io/api/v1', true, false, '["pan","aadhaar","gst","udyam","bank"]'::jsonb),
  ('signzy', 'Signzy', 'https://api.signzy.app/api/v3', true, false, '["pan","aadhaar","gst","bank","face_match","ocr"]'::jsonb),
  ('decentro', 'Decentro', 'https://in.staging.decentro.tech', true, false, '["pan","aadhaar","gst","bank"]'::jsonb)
ON CONFLICT (provider) DO NOTHING;
