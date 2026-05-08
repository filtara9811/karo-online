
-- Business / visiting card preferences on customers
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS card_link_url text,
  ADD COLUMN IF NOT EXISTS card_back_image_url text,
  ADD COLUMN IF NOT EXISTS card_field_visibility jsonb NOT NULL DEFAULT '{"name":true,"phone":true,"email":true,"address":true,"member_code":true,"company":true}'::jsonb,
  ADD COLUMN IF NOT EXISTS card_share_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS card_view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_code text;

CREATE UNIQUE INDEX IF NOT EXISTS customers_referral_code_key
  ON public.customers (referral_code)
  WHERE referral_code IS NOT NULL;

-- Generate a referral code for any customer that doesn't have one
UPDATE public.customers
SET referral_code = upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))
WHERE referral_code IS NULL;

-- Public increment helper (anyone can call when redirecting via /c/<code>)
CREATE OR REPLACE FUNCTION public.bump_card_view(_code text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.customers
     SET card_view_count = card_view_count + 1
   WHERE referral_code = _code;
$$;

GRANT EXECUTE ON FUNCTION public.bump_card_view(text) TO anon, authenticated;

-- Lookup helper (returns the link the card should redirect to)
CREATE OR REPLACE FUNCTION public.get_card_link(_code text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT card_link_url
    FROM public.customers
   WHERE referral_code = _code
   LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_card_link(text) TO anon, authenticated;

-- Public storage bucket for back-side uploads & shareable card images
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-cards', 'business-cards', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies: anyone may read; owner-only write under their userid prefix
DO $$ BEGIN
  CREATE POLICY "business-cards public read"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'business-cards');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "business-cards owner write"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'business-cards'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "business-cards owner update"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'business-cards'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "business-cards owner delete"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'business-cards'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
