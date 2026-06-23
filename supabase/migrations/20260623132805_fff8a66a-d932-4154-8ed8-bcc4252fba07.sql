
CREATE TABLE public.catalog_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  icon text,
  image_url text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(category_id, name)
);

GRANT SELECT ON public.catalog_groups TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.catalog_groups TO authenticated;
GRANT ALL ON public.catalog_groups TO service_role;

ALTER TABLE public.catalog_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "catalog_groups public read active"
  ON public.catalog_groups FOR SELECT
  USING (is_active = true OR public.is_admin_user(auth.uid()));

CREATE POLICY "catalog_groups admin insert"
  ON public.catalog_groups FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "catalog_groups admin update"
  ON public.catalog_groups FOR UPDATE TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "catalog_groups admin delete"
  ON public.catalog_groups FOR DELETE TO authenticated
  USING (public.is_admin_user(auth.uid()));

CREATE INDEX idx_catalog_groups_category ON public.catalog_groups(category_id, sort_order);

CREATE TRIGGER update_catalog_groups_updated_at
  BEFORE UPDATE ON public.catalog_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
