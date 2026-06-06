ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS card_accent_color text,
  ADD COLUMN IF NOT EXISTS card_custom_fields jsonb NOT NULL DEFAULT '[]'::jsonb;