ALTER TABLE public.vendor_item_mappings
  ADD COLUMN IF NOT EXISTS price_min numeric,
  ADD COLUMN IF NOT EXISTS price_max numeric,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS variations text[] NOT NULL DEFAULT '{}'::text[];