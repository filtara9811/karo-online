ALTER TABLE public.merchant_link_settings
  ADD COLUMN IF NOT EXISTS poster_media jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS poster_bg_transforms jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.landing_page_settings
  ADD COLUMN IF NOT EXISTS ios_app_url text;