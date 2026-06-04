
CREATE TABLE IF NOT EXISTS public.user_needs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type_id uuid NULL,
  root_category_id uuid NULL,
  sub_category_id uuid NULL,
  item_id uuid NULL,
  title text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity >= 1 AND quantity <= 999),
  images text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_needs_user_idx ON public.user_needs(user_id);
CREATE INDEX IF NOT EXISTS user_needs_sub_idx ON public.user_needs(sub_category_id);
CREATE INDEX IF NOT EXISTS user_needs_status_idx ON public.user_needs(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_needs TO authenticated;
GRANT ALL ON public.user_needs TO service_role;

ALTER TABLE public.user_needs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own needs"
  ON public.user_needs
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Vendors see needs in their categories"
  ON public.user_needs
  FOR SELECT
  TO authenticated
  USING (
    status = 'active' AND (
      EXISTS (
        SELECT 1
        FROM public.vendor_item_mappings vim
        JOIN public.catalog_items ci ON ci.id = vim.item_id
        WHERE vim.vendor_id = auth.uid()
          AND ci.category_id = user_needs.sub_category_id
      )
    )
  );

CREATE TRIGGER update_user_needs_updated_at
  BEFORE UPDATE ON public.user_needs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
