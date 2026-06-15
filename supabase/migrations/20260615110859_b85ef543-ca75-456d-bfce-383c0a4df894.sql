ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS shop_cta_label text NOT NULL DEFAULT 'Shop Visit',
  ADD COLUMN IF NOT EXISTS shop_banner_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS shop_bio text;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vendors_shop_cta_label_check'
  ) THEN
    ALTER TABLE public.vendors
      ADD CONSTRAINT vendors_shop_cta_label_check
      CHECK (shop_cta_label IN ('Shop Visit','Shop Now'));
  END IF;
END $$;

ALTER TABLE public.catalog_items
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS is_recommended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_featured_home boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_listed boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS external_url text;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'catalog_items_status_check'
  ) THEN
    ALTER TABLE public.catalog_items
      ADD CONSTRAINT catalog_items_status_check
      CHECK (status IN ('draft','active','inactive'));
  END IF;
END $$;