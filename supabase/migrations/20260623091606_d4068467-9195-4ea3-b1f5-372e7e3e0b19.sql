-- Enable realtime broadcast for catalog tables so Customer + Vendor apps reflect Admin edits instantly.
-- These tables hold no PII (catalog content only), so full-row broadcast is safe.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'catalog_types','categories','catalog_items','item_variations',
    'vendor_item_mappings','vendor_variation_mappings'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
  END LOOP;
END $$;