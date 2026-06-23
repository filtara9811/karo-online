
-- Add group_tag (Women/Men/Kids/Unisex/Other) and keywords for search & matching
ALTER TABLE public.item_variations
  ADD COLUMN IF NOT EXISTS group_tag text,
  ADD COLUMN IF NOT EXISTS keywords text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.catalog_items
  ADD COLUMN IF NOT EXISTS group_tag text,
  ADD COLUMN IF NOT EXISTS keywords text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS group_tag text,
  ADD COLUMN IF NOT EXISTS keywords text[] NOT NULL DEFAULT '{}';

-- GIN indexes for fast keyword search across all 3 levels
CREATE INDEX IF NOT EXISTS idx_item_variations_keywords ON public.item_variations USING gin (keywords);
CREATE INDEX IF NOT EXISTS idx_catalog_items_keywords    ON public.catalog_items    USING gin (keywords);
CREATE INDEX IF NOT EXISTS idx_categories_keywords       ON public.categories       USING gin (keywords);
