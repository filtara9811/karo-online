
-- ============ CATALOG TYPES (Product / Service / Other) ============
CREATE TABLE public.catalog_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.catalog_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active types" ON public.catalog_types
  FOR SELECT USING (is_active = true OR public.is_admin_user(auth.uid()));
CREATE POLICY "Admins manage types insert" ON public.catalog_types
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins manage types update" ON public.catalog_types
  FOR UPDATE TO authenticated USING (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins manage types delete" ON public.catalog_types
  FOR DELETE TO authenticated USING (public.is_admin_user(auth.uid()));

CREATE TRIGGER trg_catalog_types_updated
  BEFORE UPDATE ON public.catalog_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ CATEGORIES: link to type ============
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS type_id UUID REFERENCES public.catalog_types(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_categories_type ON public.categories(type_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON public.categories(parent_id);

-- ============ CATALOG ITEMS (e.g. AC Service, Carpenter) ============
CREATE TABLE public.catalog_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  image_url TEXT,
  price_min NUMERIC(10,2),
  price_max NUMERIC(10,2),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_catalog_items_category ON public.catalog_items(category_id);

ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active items" ON public.catalog_items
  FOR SELECT USING (is_active = true OR public.is_admin_user(auth.uid()));
CREATE POLICY "Admins insert items" ON public.catalog_items
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins update items" ON public.catalog_items
  FOR UPDATE TO authenticated USING (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins delete items" ON public.catalog_items
  FOR DELETE TO authenticated USING (public.is_admin_user(auth.uid()));

CREATE TRIGGER trg_catalog_items_updated
  BEFORE UPDATE ON public.catalog_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ITEM VARIATIONS (e.g. AC Repair, AC Install) ============
CREATE TABLE public.item_variations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.catalog_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price_min NUMERIC(10,2),
  price_max NUMERIC(10,2),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_item_variations_item ON public.item_variations(item_id);

ALTER TABLE public.item_variations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active variations" ON public.item_variations
  FOR SELECT USING (is_active = true OR public.is_admin_user(auth.uid()));
CREATE POLICY "Admins insert variations" ON public.item_variations
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins update variations" ON public.item_variations
  FOR UPDATE TO authenticated USING (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins delete variations" ON public.item_variations
  FOR DELETE TO authenticated USING (public.is_admin_user(auth.uid()));

CREATE TRIGGER trg_item_variations_updated
  BEFORE UPDATE ON public.item_variations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ VENDOR MAPPING (item-level) ============
CREATE TABLE public.vendor_item_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL,
  item_id UUID NOT NULL REFERENCES public.catalog_items(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (vendor_id, item_id)
);

CREATE INDEX idx_vim_vendor ON public.vendor_item_mappings(vendor_id);
CREATE INDEX idx_vim_item ON public.vendor_item_mappings(item_id);

ALTER TABLE public.vendor_item_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors view their mappings" ON public.vendor_item_mappings
  FOR SELECT TO authenticated USING (auth.uid() = vendor_id OR public.is_admin_user(auth.uid()));
CREATE POLICY "Vendors insert their mappings" ON public.vendor_item_mappings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = vendor_id);
CREATE POLICY "Vendors update their mappings" ON public.vendor_item_mappings
  FOR UPDATE TO authenticated USING (auth.uid() = vendor_id OR public.is_admin_user(auth.uid()));
CREATE POLICY "Vendors delete their mappings" ON public.vendor_item_mappings
  FOR DELETE TO authenticated USING (auth.uid() = vendor_id OR public.is_admin_user(auth.uid()));
CREATE POLICY "Public can view active mappings" ON public.vendor_item_mappings
  FOR SELECT USING (is_active = true);

CREATE TRIGGER trg_vim_updated
  BEFORE UPDATE ON public.vendor_item_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ VENDOR VARIATION MAPPING (optional fine-grain) ============
CREATE TABLE public.vendor_variation_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL,
  variation_id UUID NOT NULL REFERENCES public.item_variations(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (vendor_id, variation_id)
);

CREATE INDEX idx_vvm_vendor ON public.vendor_variation_mappings(vendor_id);
CREATE INDEX idx_vvm_variation ON public.vendor_variation_mappings(variation_id);

ALTER TABLE public.vendor_variation_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors view their var mappings" ON public.vendor_variation_mappings
  FOR SELECT TO authenticated USING (auth.uid() = vendor_id OR public.is_admin_user(auth.uid()));
CREATE POLICY "Vendors insert their var mappings" ON public.vendor_variation_mappings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = vendor_id);
CREATE POLICY "Vendors update their var mappings" ON public.vendor_variation_mappings
  FOR UPDATE TO authenticated USING (auth.uid() = vendor_id OR public.is_admin_user(auth.uid()));
CREATE POLICY "Vendors delete their var mappings" ON public.vendor_variation_mappings
  FOR DELETE TO authenticated USING (auth.uid() = vendor_id OR public.is_admin_user(auth.uid()));
CREATE POLICY "Public can view active var mappings" ON public.vendor_variation_mappings
  FOR SELECT USING (is_active = true);

CREATE TRIGGER trg_vvm_updated
  BEFORE UPDATE ON public.vendor_variation_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ STORAGE BUCKET for catalog images ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('catalog', 'catalog', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can read catalog images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'catalog');

CREATE POLICY "Admins can upload catalog images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'catalog' AND public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can update catalog images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'catalog' AND public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can delete catalog images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'catalog' AND public.is_admin_user(auth.uid()));

-- ============ SEED Default Types ============
INSERT INTO public.catalog_types (code, name, icon, sort_order) VALUES
  ('product', 'Product', '📦', 1),
  ('service', 'Service', '🛠️', 2),
  ('other',   'Other',   '✨', 3)
ON CONFLICT (code) DO NOTHING;
