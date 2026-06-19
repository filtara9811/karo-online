ALTER TABLE public.merchant_link_settings
  ADD COLUMN IF NOT EXISTS payment_amount_inr numeric(10,2) CHECK (payment_amount_inr IS NULL OR payment_amount_inr > 0);

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
         NULLIF(cover_image_url,'')
    INTO _vendor_verified, _vendor_shop_url, _vendor_shop_name, _vendor_cover
    FROM public.vendors WHERE user_id = _user_id LIMIT 1;

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
      'cover_url', _vendor_cover
    ),
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

GRANT EXECUTE ON FUNCTION public.get_public_landing(text) TO anon, authenticated, service_role;

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
    poster_bg_url = COALESCE(EXCLUDED.poster_bg_url, public.merchant_link_settings.poster_bg_url),
    play_store_enabled = EXCLUDED.play_store_enabled,
    payment_enabled = EXCLUDED.payment_enabled,
    payment_provider = EXCLUDED.payment_provider,
    payment_upi_id = EXCLUDED.payment_upi_id,
    payment_label = EXCLUDED.payment_label,
    payment_amount_inr = EXCLUDED.payment_amount_inr,
    digital_shop_enabled = EXCLUDED.digital_shop_enabled,
    digital_shop_url = EXCLUDED.digital_shop_url,
    extra_links = EXCLUDED.extra_links,
    poster_media = COALESCE(NULLIF(EXCLUDED.poster_media, '[]'::jsonb), public.merchant_link_settings.poster_media),
    poster_bg_urls = COALESCE(NULLIF(EXCLUDED.poster_bg_urls, '[]'::jsonb), public.merchant_link_settings.poster_bg_urls),
    poster_bg_transforms = COALESCE(NULLIF(EXCLUDED.poster_bg_transforms, '[]'::jsonb), public.merchant_link_settings.poster_bg_transforms),
    updated_at = now();

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_merchant_link_settings(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_merchant_link_settings(jsonb) TO authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'leads'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.leads';
  END IF;
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.leads (
    id, customer_id, type_id, root_category_id, sub_category_id, sub_category_name,
    item_ids, item_names, status, accepted_vendor_id, accepted_at,
    created_at, updated_at, max_slots, accepted_count,
    lead_price_inr, accepted_vendor_ids, source, lead_rating, lead_review,
    customer_approved_vendor_id, search_radius_km, vendor_types, is_remote
  )';
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'vendors'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.vendors';
  END IF;
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.vendors (
    id, user_id, role, owner_name, entity, trade, deals_in, business_name,
    website, plan, is_blocked, status, avatar_url, created_at, updated_at,
    verified, google_place_id, auto_accept_leads, service_radius_km,
    current_team_count, van_count, is_online, location_updated_at,
    operation_mode, is_premium, vendor_type, is_remote_capable, cover_image_url, cover_video_url
  )';
END $$;