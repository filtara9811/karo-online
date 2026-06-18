
-- 1) Add multi-image rotation slots to merchant_link_settings
ALTER TABLE public.merchant_link_settings
  ADD COLUMN IF NOT EXISTS poster_bg_urls jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2) Replace get_public_landing so it resolves codes from referral_codes (4+4)
--    AND legacy customers.referral_code. Returns the merchant + their settings.
CREATE OR REPLACE FUNCTION public.get_public_landing(_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid;
  _resolved_code text;
  _customer record;
  _settings record;
  _landing record;
  _vendor_kyc boolean;
  _vendor_shop_url text;
  _vendor_shop_name text;
BEGIN
  IF _code IS NULL OR length(trim(_code)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_code');
  END IF;

  -- Resolve via referral_codes table first (this is where 4+4 codes live)
  SELECT user_id, code
    INTO _user_id, _resolved_code
    FROM public.referral_codes
   WHERE upper(code) = upper(trim(_code))
   LIMIT 1;

  -- Fallback: legacy customers.referral_code lookup
  IF _user_id IS NULL THEN
    SELECT id, referral_code
      INTO _user_id, _resolved_code
      FROM public.customers
     WHERE upper(referral_code) = upper(trim(_code))
     LIMIT 1;
  END IF;

  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  SELECT id, name, phone, avatar_url, shop_name, referral_code
    INTO _customer
    FROM public.customers
   WHERE id = _user_id
   LIMIT 1;

  SELECT * INTO _settings FROM public.merchant_link_settings WHERE user_id = _user_id LIMIT 1;
  SELECT * INTO _landing FROM public.landing_page_settings WHERE id = 1;

  SELECT (kyc_status = 'verified'),
         NULLIF(public_shop_url, ''),
         NULLIF(shop_name, '')
    INTO _vendor_kyc, _vendor_shop_url, _vendor_shop_name
    FROM public.vendors WHERE user_id = _user_id LIMIT 1;

  RETURN jsonb_build_object(
    'ok', true,
    'merchant', jsonb_build_object(
      'name', COALESCE(_customer.name, 'Karo Merchant'),
      'shop_name', COALESCE(_customer.shop_name, _vendor_shop_name),
      'avatar_url', _customer.avatar_url,
      'verified', COALESCE(_vendor_kyc, false),
      'code', COALESCE(_customer.referral_code, _resolved_code)
    ),
    'links', jsonb_build_object(
      'poster_bg_url', _settings.poster_bg_url,
      'poster_bg_urls', COALESCE(_settings.poster_bg_urls, '[]'::jsonb),
      'play_store_enabled', COALESCE(_settings.play_store_enabled, true),
      'payment_enabled', COALESCE(_settings.payment_enabled, false),
      'payment_provider', COALESCE(_settings.payment_provider, 'upi'),
      'payment_upi_id', _settings.payment_upi_id,
      'payment_label', _settings.payment_label,
      'digital_shop_enabled', COALESCE(_settings.digital_shop_enabled, false),
      'digital_shop_url', COALESCE(_settings.digital_shop_url, _vendor_shop_url),
      'extra_links', COALESCE(_settings.extra_links, '[]'::jsonb)
    ),
    'landing', jsonb_build_object(
      'top_banner_url', _landing.top_banner_url,
      'top_banner_link', _landing.top_banner_link,
      'bottom_banner_url', _landing.bottom_banner_url,
      'bottom_banner_link', _landing.bottom_banner_link,
      'admob_publisher_id', _landing.admob_publisher_id,
      'admob_top_slot', _landing.admob_top_slot,
      'admob_bottom_slot', _landing.admob_bottom_slot,
      'announcement_text', _landing.announcement_text,
      'announcement_active', COALESCE(_landing.announcement_active, false)
    )
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_public_landing(text) TO anon, authenticated;
