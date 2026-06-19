CREATE OR REPLACE FUNCTION public.upsert_merchant_link_settings(_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated');
  END IF;

  INSERT INTO public.merchant_link_settings (
    user_id, poster_bg_url,
    play_store_enabled,
    payment_enabled, payment_provider, payment_upi_id, payment_label, payment_amount_inr,
    digital_shop_enabled, digital_shop_url,
    extra_links,
    poster_media, poster_bg_urls, poster_bg_transforms
  ) VALUES (
    _uid,
    NULLIF(_payload->>'poster_bg_url',''),
    COALESCE((_payload->>'play_store_enabled')::boolean, true),
    COALESCE((_payload->>'payment_enabled')::boolean, false),
    COALESCE(NULLIF(_payload->>'payment_provider',''), 'upi'),
    NULLIF(_payload->>'payment_upi_id',''),
    NULLIF(_payload->>'payment_label',''),
    NULLIF(_payload->>'payment_amount_inr','')::numeric,
    COALESCE((_payload->>'digital_shop_enabled')::boolean, false),
    NULLIF(_payload->>'digital_shop_url',''),
    COALESCE(_payload->'extra_links', '[]'::jsonb),
    COALESCE(_payload->'poster_media', '[]'::jsonb),
    COALESCE(_payload->'poster_bg_urls', '[]'::jsonb),
    COALESCE(_payload->'poster_bg_transforms', '[]'::jsonb)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    poster_bg_url = CASE WHEN _payload ? 'poster_bg_url' THEN EXCLUDED.poster_bg_url ELSE public.merchant_link_settings.poster_bg_url END,
    play_store_enabled = CASE WHEN _payload ? 'play_store_enabled' THEN EXCLUDED.play_store_enabled ELSE public.merchant_link_settings.play_store_enabled END,
    payment_enabled = CASE WHEN _payload ? 'payment_enabled' THEN EXCLUDED.payment_enabled ELSE public.merchant_link_settings.payment_enabled END,
    payment_provider = CASE WHEN _payload ? 'payment_provider' THEN EXCLUDED.payment_provider ELSE public.merchant_link_settings.payment_provider END,
    payment_upi_id = CASE WHEN _payload ? 'payment_upi_id' THEN EXCLUDED.payment_upi_id ELSE public.merchant_link_settings.payment_upi_id END,
    payment_label = CASE WHEN _payload ? 'payment_label' THEN EXCLUDED.payment_label ELSE public.merchant_link_settings.payment_label END,
    payment_amount_inr = CASE WHEN _payload ? 'payment_amount_inr' THEN EXCLUDED.payment_amount_inr ELSE public.merchant_link_settings.payment_amount_inr END,
    digital_shop_enabled = CASE WHEN _payload ? 'digital_shop_enabled' THEN EXCLUDED.digital_shop_enabled ELSE public.merchant_link_settings.digital_shop_enabled END,
    digital_shop_url = CASE WHEN _payload ? 'digital_shop_url' THEN EXCLUDED.digital_shop_url ELSE public.merchant_link_settings.digital_shop_url END,
    extra_links = CASE WHEN _payload ? 'extra_links' THEN EXCLUDED.extra_links ELSE public.merchant_link_settings.extra_links END,
    poster_media = CASE WHEN _payload ? 'poster_media' THEN EXCLUDED.poster_media ELSE public.merchant_link_settings.poster_media END,
    poster_bg_urls = CASE WHEN _payload ? 'poster_bg_urls' THEN EXCLUDED.poster_bg_urls ELSE public.merchant_link_settings.poster_bg_urls END,
    poster_bg_transforms = CASE WHEN _payload ? 'poster_bg_transforms' THEN EXCLUDED.poster_bg_transforms ELSE public.merchant_link_settings.poster_bg_transforms END,
    updated_at = now();

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_merchant_link_settings(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_merchant_link_settings(jsonb) TO authenticated;