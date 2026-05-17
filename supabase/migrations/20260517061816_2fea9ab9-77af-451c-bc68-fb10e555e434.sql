REVOKE UPDATE ON public.vendor_status_updates FROM authenticated;
GRANT UPDATE (customer_read_at) ON public.vendor_status_updates TO authenticated;