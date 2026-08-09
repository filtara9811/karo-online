ALTER TABLE public.qr_projects
  ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_inr integer NOT NULL DEFAULT 0;

DROP POLICY IF EXISTS "Public can read qr project appearance" ON public.qr_projects;
REVOKE SELECT ON public.qr_projects FROM anon;