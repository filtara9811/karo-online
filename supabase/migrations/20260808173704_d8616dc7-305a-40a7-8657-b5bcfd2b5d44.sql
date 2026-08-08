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
  _vendor_verified boolean;
  _vendor_shop_url text;
  _vendor_shop_name text;
  _vendor_cover text;
  _vendor_trade text;
  _theme record;
  _ads jsonb;
BEGIN
  IF _code IS NULL OR length(trim(_code)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_code');
  END IF;

  SELECT user_id, code INTO _user_id, _resolved_code
    FROM public.referral_codes
   WHERE upper(code) = upper(trim(_code)) LIMIT 1;

  IF _user_id IS NULL THEN
    SELECT id, referral_code INTO _user_id, _resolved_code
      FROM public.customers
     WHERE upper(referral_code) = upper(trim(_code)) LIMIT 1;
  END IF;

  SELECT * INTO _landing FROM public.landing_page_settings WHERE id = 1;

  IF _user_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'merchant', jsonb_build_object('name','Karo Online Merchant','shop_name',NULL,'avatar_url',NULL,'verified',false,'code',_code,'phone',NULL,'address',NULL),
      'links', jsonb_build_object('play_store_enabled', true, 'payment_enabled', false, 'digital_shop_enabled', false, 'extra_links', '[]'::jsonb, 'poster_media', '[]'::jsonb, 'poster_bg_urls', '[]'::jsonb),
      'theme', jsonb_build_object('key','classic_amber','preset','classic','style','shop','accent_color','#f59e0b','bg_from','#fffbeb','bg_to','#ffffff'),
      'ads', '[]'::jsonb,
      'landing', jsonb_build_object(
        'top_banner_url', _landing.top_banner_url,
        'top_banner_link', _landing.top_banner_link,
        'bottom_banner_url', _landing.bottom_banner_url,
        'bottom_banner_link', _landing.bottom_banner_link,
        'admob_publisher_id', _landing.admob_publisher_id,
        'admob_top_slot', _landing.admob_top_slot,
        'admob_bottom_slot', _landing.admob_bottom_slot,
        'announcement_text', _landing.announcement_text,
        'announcement_active', COALESCE(_landing.announcement_active, false),
        'ios_app_url', _landing.ios_app_url
      )
    );
  END IF;

  SELECT id, name, phone, avatar_url, shop_name, referral_code, address, upi_id
    INTO _customer FROM public.customers WHERE id = _user_id LIMIT 1;

  SELECT * INTO _settings FROM public.merchant_link_settings WHERE user_id = _user_id LIMIT 1;

  SELECT COALESCE(verified, false),
         NULLIF(website,''),
         NULLIF(business_name,''),
         NULLIF(cover_image_url,''),
         NULLIF(trade,'')
    INTO _vendor_verified, _vendor_shop_url, _vendor_shop_name, _vendor_cover, _vendor_trade
    FROM public.vendors WHERE user_id = _user_id LIMIT 1;

  SELECT * INTO _theme FROM public.qr_landing_themes
   WHERE key = COALESCE(_settings.landing_theme_key, 'classic_amber') AND is_active LIMIT 1;
  IF _theme.key IS NULL THEN
    SELECT * INTO _theme FROM public.qr_landing_themes WHERE key = 'classic_amber' LIMIT 1;
  END IF;

  SELECT COALESCE(jsonb_agg(a), '[]'::jsonb) INTO _ads FROM (
    SELECT jsonb_build_object(
      'name', COALESCE(NULLIF(v.business_name,''), 'Karo Shop'),
      'trade', v.trade,
      'image', COALESCE(NULLIF(v.cover_image_url,''), NULLIF(v.avatar_url,'')),
      'url', NULLIF(v.website,'')
    ) AS a
    FROM public.vendors v
    WHERE v.user_id <> _user_id
      AND COALESCE(v.verified, false)
      AND (_vendor_trade IS NULL OR v.trade = _vendor_trade)
      AND COALESCE(NULLIF(v.cover_image_url,''), NULLIF(v.avatar_url,'')) IS NOT NULL
    ORDER BY COALESCE(v.is_premium, false) DESC, v.created_at DESC
    LIMIT 8
  ) s;

  RETURN jsonb_build_object(
    'ok', true,
    'merchant', jsonb_build_object(
      'name', COALESCE(_customer.name, 'Karo Merchant'),
      'shop_name', COALESCE(_customer.shop_name, _vendor_shop_name),
      'avatar_url', _customer.avatar_url,
      'verified', COALESCE(_vendor_verified, false),
      'code', COALESCE(_customer.referral_code, _resolved_code),
      'phone', _customer.phone,
      'address', _customer.address,
      'cover_url', _vendor_cover,
      'trade', _vendor_trade
    ),
    'theme', jsonb_build_object(
      'key', COALESCE(_theme.key, 'classic_amber'),
      'preset', COALESCE(_theme.preset, 'classic'),
      'style', COALESCE(_theme.style, 'shop'),
      'accent_color', COALESCE(NULLIF(_settings.landing_theme_accent,''), _theme.accent_color, '#f59e0b'),
      'bg_from', COALESCE(_theme.bg_from, '#fffbeb'),
      'bg_to', COALESCE(_theme.bg_to, '#ffffff')
    ),
    'ads', COALESCE(_ads, '[]'::jsonb),
    'links', jsonb_build_object(
      'poster_bg_url', _settings.poster_bg_url,
      'poster_bg_urls', COALESCE(_settings.poster_bg_urls, '[]'::jsonb),
      'poster_media', COALESCE(_settings.poster_media, '[]'::jsonb),
      'play_store_enabled', COALESCE(_settings.play_store_enabled, true),
      'payment_enabled', COALESCE(_settings.payment_enabled, false),
      'payment_provider', COALESCE(_settings.payment_provider, 'upi'),
      'payment_upi_id', COALESCE(_settings.payment_upi_id, _customer.upi_id),
      'payment_label', _settings.payment_label,
      'payment_amount_inr', _settings.payment_amount_inr,
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
      'announcement_active', COALESCE(_landing.announcement_active, false),
      'ios_app_url', _landing.ios_app_url
    )
  );
END;
$function$;