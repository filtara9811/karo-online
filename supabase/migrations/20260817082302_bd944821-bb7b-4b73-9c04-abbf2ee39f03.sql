-- 1. Per-project shop settings -------------------------------------------------
ALTER TABLE public.merchant_link_settings
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.qr_projects(id) ON DELETE CASCADE;

UPDATE public.merchant_link_settings s
   SET project_id = p.id
  FROM (
    SELECT DISTINCT ON (user_id) id, user_id
      FROM public.qr_projects
     ORDER BY user_id, created_at ASC
  ) p
 WHERE p.user_id = s.user_id AND s.project_id IS NULL;

ALTER TABLE public.merchant_link_settings DROP CONSTRAINT IF EXISTS merchant_link_settings_pkey;

CREATE UNIQUE INDEX IF NOT EXISTS merchant_link_settings_user_project_uidx
  ON public.merchant_link_settings (user_id, project_id) WHERE project_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS merchant_link_settings_user_default_uidx
  ON public.merchant_link_settings (user_id) WHERE project_id IS NULL;

-- 2. Upsert settings for a specific project ------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_merchant_link_settings(_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _pid uuid;
  _slug text := nullif(btrim(coalesce(_payload->>'project_slug','')), '');
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated');
  END IF;

  IF _slug IS NOT NULL THEN
    SELECT id INTO _pid FROM public.qr_projects WHERE user_id = _uid AND slug = _slug LIMIT 1;
  END IF;
  IF _pid IS NULL AND (_payload ? 'project_id') THEN
    SELECT id INTO _pid FROM public.qr_projects
     WHERE user_id = _uid AND id = nullif(_payload->>'project_id','')::uuid LIMIT 1;
  END IF;
  IF _pid IS NULL THEN
    SELECT id INTO _pid FROM public.qr_projects WHERE user_id = _uid ORDER BY created_at ASC LIMIT 1;
  END IF;

  IF _pid IS NULL THEN
    INSERT INTO public.merchant_link_settings (user_id)
    VALUES (_uid)
    ON CONFLICT (user_id) WHERE project_id IS NULL DO NOTHING;
  ELSE
    INSERT INTO public.merchant_link_settings (user_id, project_id)
    VALUES (_uid, _pid)
    ON CONFLICT (user_id, project_id) WHERE project_id IS NOT NULL DO NOTHING;
  END IF;

  UPDATE public.merchant_link_settings m SET
    poster_bg_url = CASE WHEN _payload ? 'poster_bg_url' THEN nullif(_payload->>'poster_bg_url','') ELSE m.poster_bg_url END,
    play_store_enabled = CASE WHEN _payload ? 'play_store_enabled' THEN coalesce((_payload->>'play_store_enabled')::boolean, true) ELSE m.play_store_enabled END,
    payment_enabled = CASE WHEN _payload ? 'payment_enabled' THEN coalesce((_payload->>'payment_enabled')::boolean, false) ELSE m.payment_enabled END,
    payment_provider = CASE WHEN _payload ? 'payment_provider' THEN coalesce(nullif(_payload->>'payment_provider',''), 'upi') ELSE m.payment_provider END,
    payment_upi_id = CASE WHEN _payload ? 'payment_upi_id' THEN nullif(_payload->>'payment_upi_id','') ELSE m.payment_upi_id END,
    payment_label = CASE WHEN _payload ? 'payment_label' THEN nullif(_payload->>'payment_label','') ELSE m.payment_label END,
    payment_amount_inr = CASE WHEN _payload ? 'payment_amount_inr' THEN nullif(_payload->>'payment_amount_inr','')::numeric ELSE m.payment_amount_inr END,
    digital_shop_enabled = CASE WHEN _payload ? 'digital_shop_enabled' THEN coalesce((_payload->>'digital_shop_enabled')::boolean, false) ELSE m.digital_shop_enabled END,
    digital_shop_url = CASE WHEN _payload ? 'digital_shop_url' THEN nullif(_payload->>'digital_shop_url','') ELSE m.digital_shop_url END,
    extra_links = CASE WHEN _payload ? 'extra_links' THEN coalesce(_payload->'extra_links','[]'::jsonb) ELSE m.extra_links END,
    poster_media = CASE WHEN _payload ? 'poster_media' THEN coalesce(_payload->'poster_media','[]'::jsonb) ELSE m.poster_media END,
    poster_bg_urls = CASE WHEN _payload ? 'poster_bg_urls' THEN coalesce(_payload->'poster_bg_urls','[]'::jsonb) ELSE m.poster_bg_urls END,
    poster_bg_transforms = CASE WHEN _payload ? 'poster_bg_transforms' THEN coalesce(_payload->'poster_bg_transforms','[]'::jsonb) ELSE m.poster_bg_transforms END,
    yt_source = CASE WHEN _payload ? 'yt_source' THEN nullif(_payload->>'yt_source','') ELSE m.yt_source END,
    yt_enabled = CASE WHEN _payload ? 'yt_enabled' THEN coalesce((_payload->>'yt_enabled')::boolean, false) ELSE m.yt_enabled END,
    yt_products = CASE WHEN _payload ? 'yt_products' THEN coalesce(_payload->'yt_products','{}'::jsonb) ELSE m.yt_products END,
    updated_at = now()
  WHERE m.user_id = _uid
    AND ((_pid IS NULL AND m.project_id IS NULL) OR (_pid IS NOT NULL AND m.project_id = _pid));

  RETURN jsonb_build_object('ok', true, 'project_id', _pid);
END;
$$;

-- Theme setter also writes to the project row -----------------------------------
CREATE OR REPLACE FUNCTION public.set_qr_landing_theme(_key text, _accent text DEFAULT NULL, _project text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _pid uuid;
  _premium boolean;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated'); END IF;

  SELECT is_premium INTO _premium FROM public.qr_landing_themes WHERE key = _key AND is_active LIMIT 1;
  IF _premium IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'unknown_theme'); END IF;

  IF nullif(btrim(coalesce(_project,'')),'') IS NOT NULL THEN
    SELECT id INTO _pid FROM public.qr_projects WHERE user_id = _uid AND slug = btrim(_project) LIMIT 1;
  END IF;
  IF _pid IS NULL THEN
    SELECT id INTO _pid FROM public.qr_projects WHERE user_id = _uid ORDER BY created_at ASC LIMIT 1;
  END IF;

  IF _premium AND NOT EXISTS (
    SELECT 1 FROM public.merchant_link_settings
     WHERE user_id = _uid AND coalesce(premium_unlocked, false)
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'premium_locked');
  END IF;

  IF _pid IS NULL THEN
    INSERT INTO public.merchant_link_settings (user_id) VALUES (_uid)
    ON CONFLICT (user_id) WHERE project_id IS NULL DO NOTHING;
  ELSE
    INSERT INTO public.merchant_link_settings (user_id, project_id) VALUES (_uid, _pid)
    ON CONFLICT (user_id, project_id) WHERE project_id IS NOT NULL DO NOTHING;
  END IF;

  UPDATE public.merchant_link_settings m
     SET landing_theme_key = _key,
         landing_theme_accent = nullif(btrim(coalesce(_accent,'')),''),
         updated_at = now()
   WHERE m.user_id = _uid
     AND ((_pid IS NULL AND m.project_id IS NULL) OR (_pid IS NOT NULL AND m.project_id = _pid));

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 3. Public landing resolves the scanned project --------------------------------
DROP FUNCTION IF EXISTS public.get_public_landing(text);

CREATE OR REPLACE FUNCTION public.get_public_landing(_code text, _project text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _resolved_code text;
  _customer record;
  _settings record;
  _landing record;
  _proj record;
  _vendor_verified boolean;
  _vendor_shop_url text;
  _vendor_shop_name text;
  _vendor_cover text;
  _vendor_trade text;
  _theme record;
  _ads jsonb;
  _slug text := nullif(btrim(coalesce(_project,'')), '');
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
      'links', jsonb_build_object('play_store_enabled', true, 'payment_enabled', false, 'digital_shop_enabled', false, 'extra_links', '[]'::jsonb, 'poster_media', '[]'::jsonb, 'poster_bg_urls', '[]'::jsonb, 'yt_enabled', false, 'yt_source', NULL, 'yt_products', '{}'::jsonb),
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

  -- Which project (shop) was scanned?
  IF _slug IS NOT NULL THEN
    SELECT * INTO _proj FROM public.qr_projects
     WHERE user_id = _user_id AND slug = _slug LIMIT 1;
  END IF;
  IF _proj.id IS NULL THEN
    SELECT * INTO _proj FROM public.qr_projects
     WHERE user_id = _user_id ORDER BY created_at ASC LIMIT 1;
  END IF;

  IF _proj.id IS NOT NULL THEN
    SELECT s.* INTO _settings FROM public.merchant_link_settings s
     WHERE s.user_id = _user_id AND s.project_id = _proj.id LIMIT 1;
  END IF;
  IF _settings.user_id IS NULL THEN
    SELECT s.* INTO _settings FROM public.merchant_link_settings s
     WHERE s.user_id = _user_id AND s.project_id IS NULL LIMIT 1;
  END IF;

  SELECT COALESCE(verified, false),
         NULLIF(website,''),
         NULLIF(business_name,''),
         NULLIF(cover_image_url,''),
         NULLIF(trade,'')
    INTO _vendor_verified, _vendor_shop_url, _vendor_shop_name, _vendor_cover, _vendor_trade
    FROM public.vendors WHERE user_id = _user_id LIMIT 1;

  SELECT * INTO _theme FROM public.qr_landing_themes
   WHERE key = COALESCE(_settings.landing_theme_key, _proj.theme_key, 'classic_amber') AND is_active LIMIT 1;
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
    'project', CASE WHEN _proj.id IS NULL THEN NULL ELSE jsonb_build_object(
      'slug', _proj.slug, 'title', _proj.title, 'business_name', _proj.business_name
    ) END,
    'merchant', jsonb_build_object(
      'name', COALESCE(NULLIF(_proj.business_name,''), _customer.name, 'Karo Merchant'),
      'shop_name', COALESCE(NULLIF(_proj.business_name,''), _customer.shop_name, _vendor_shop_name),
      'avatar_url', COALESCE(NULLIF(_proj.avatar_url,''), _customer.avatar_url),
      'verified', COALESCE(_vendor_verified, false),
      'code', COALESCE(_customer.referral_code, _resolved_code),
      'phone', COALESCE(NULLIF(_proj.contact_phone,''), _customer.phone),
      'address', _customer.address,
      'cover_url', COALESCE(NULLIF(_proj.cover_image_url,''), _vendor_cover),
      'trade', COALESCE(NULLIF(_proj.category,''), _vendor_trade)
    ),
    'theme', jsonb_build_object(
      'key', COALESCE(_theme.key, 'classic_amber'),
      'preset', COALESCE(_theme.preset, 'classic'),
      'style', COALESCE(_theme.style, 'shop'),
      'accent_color', COALESCE(NULLIF(_settings.landing_theme_accent,''), NULLIF(_proj.accent_color,''), _theme.accent_color, '#f59e0b'),
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
      'extra_links', COALESCE(_settings.extra_links, '[]'::jsonb),
      'yt_enabled', COALESCE(_settings.yt_enabled, false),
      'yt_source', NULLIF(_settings.yt_source, ''),
      'yt_products', COALESCE(_settings.yt_products, '{}'::jsonb)
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
$$;

DROP FUNCTION IF EXISTS public.get_public_landing_stats(text);

CREATE OR REPLACE FUNCTION public.get_public_landing_stats(_code text, _project text DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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
  WHERE code IS NOT NULL AND upper(code) = upper(btrim(coalesce(_code, '')))
    AND (nullif(btrim(coalesce(_project,'')),'') IS NULL
         OR project_slug IS NULL
         OR project_slug = btrim(_project));
$$;

-- 4. Public shop directory for the Vendors marketplace --------------------------
CREATE OR REPLACE FUNCTION public.list_public_shops(_q text DEFAULT NULL, _limit integer DEFAULT 30, _offset integer DEFAULT 0)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb) FROM (
    SELECT p.slug,
           coalesce(nullif(p.business_name,''), p.title) AS name,
           p.category,
           p.avatar_url,
           p.cover_image_url,
           coalesce(rc.code, c.referral_code) AS code,
           coalesce(p.is_paid, false) AS sponsored,
           p.created_at
      FROM public.qr_projects p
      LEFT JOIN public.referral_codes rc ON rc.user_id = p.user_id
      LEFT JOIN public.customers c ON c.id = p.user_id
     WHERE coalesce(rc.code, c.referral_code) IS NOT NULL
       AND (nullif(btrim(coalesce(_q,'')),'') IS NULL
            OR coalesce(p.business_name,'') ILIKE '%' || btrim(_q) || '%'
            OR coalesce(p.title,'') ILIKE '%' || btrim(_q) || '%'
            OR coalesce(p.category,'') ILIKE '%' || btrim(_q) || '%')
     ORDER BY coalesce(p.is_paid, false) DESC, p.created_at DESC
     LIMIT greatest(1, least(coalesce(_limit, 30), 100))
    OFFSET greatest(0, coalesce(_offset, 0))
  ) x;
$$;

GRANT EXECUTE ON FUNCTION public.list_public_shops(text, integer, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_landing(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_landing_stats(text, text) TO anon, authenticated;

-- 5. Scan history ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.qr_scan_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  raw_value text NOT NULL,
  shop_name text,
  shop_code text,
  project_slug text,
  kind text NOT NULL DEFAULT 'external',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.qr_scan_history TO authenticated;
GRANT ALL ON public.qr_scan_history TO service_role;

ALTER TABLE public.qr_scan_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own scan history" ON public.qr_scan_history
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own scan history" ON public.qr_scan_history
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own scan history" ON public.qr_scan_history
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS qr_scan_history_user_idx ON public.qr_scan_history (user_id, created_at DESC);