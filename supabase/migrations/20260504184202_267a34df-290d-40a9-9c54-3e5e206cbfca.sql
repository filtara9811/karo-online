ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS upi_id text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS shop_name text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS shop_url text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS shop_logo_url text;