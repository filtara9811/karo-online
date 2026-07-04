ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS gallery_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS intro_video_url text,
  ADD COLUMN IF NOT EXISTS working_hours jsonb,
  ADD COLUMN IF NOT EXISTS lead_preferences jsonb,
  ADD COLUMN IF NOT EXISTS experience_years integer,
  ADD COLUMN IF NOT EXISTS profile_photo_url text;