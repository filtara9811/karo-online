ALTER TABLE public.catalog_types REPLICA IDENTITY FULL;
ALTER TABLE public.categories REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.catalog_types;
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;