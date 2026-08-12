CREATE OR REPLACE FUNCTION public.get_public_landing_stats(_code text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'views', count(*) FILTER (WHERE event_type IN ('STORE_VIEW','QR_SCAN')),
    'shares', count(*) FILTER (WHERE event_type = 'CAMPAIGN_CLICK' AND coalesce(meta->>'action','') LIKE 'share%'),
    'inquiries', count(*) FILTER (WHERE event_type IN ('PRODUCT_ENQUIRY','WHATSAPP_CLICK','CALL_CLICK','CHAT')),
    'tags', count(*) FILTER (WHERE event_type = 'CAMPAIGN_CLICK' AND coalesce(meta->>'action','') = 'tag'),
    'orders', count(*) FILTER (WHERE event_type = 'ORDER_CREATED'),
    'installs', count(*) FILTER (WHERE event_type = 'PWA_INSTALL')
  )
  FROM public.qr_events
  WHERE code IS NOT NULL AND upper(code) = upper(btrim(coalesce(_code, '')));
$$;

REVOKE ALL ON FUNCTION public.get_public_landing_stats(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_landing_stats(text) TO anon, authenticated;