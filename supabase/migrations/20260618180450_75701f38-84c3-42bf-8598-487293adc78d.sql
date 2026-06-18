
CREATE TABLE IF NOT EXISTS public.merchant_link_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  poster_bg_url text,
  play_store_enabled boolean NOT NULL DEFAULT true,
  payment_enabled boolean NOT NULL DEFAULT false,
  payment_provider text NOT NULL DEFAULT 'upi',
  payment_upi_id text,
  payment_label text,
  digital_shop_enabled boolean NOT NULL DEFAULT false,
  digital_shop_url text,
  extra_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  premium_unlocked boolean NOT NULL DEFAULT false,
  premium_paid_at timestamptz,
  premium_payment_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.merchant_link_settings TO authenticated;
GRANT ALL ON public.merchant_link_settings TO service_role;

ALTER TABLE public.merchant_link_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own merchant link settings"
  ON public.merchant_link_settings FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage all merchant link settings"
  ON public.merchant_link_settings FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));

CREATE TRIGGER trg_merchant_link_settings_updated_at
  BEFORE UPDATE ON public.merchant_link_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.landing_page_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  top_banner_url text,
  top_banner_link text,
  bottom_banner_url text,
  bottom_banner_link text,
  admob_publisher_id text,
  admob_top_slot text,
  admob_bottom_slot text,
  announcement_text text,
  announcement_active boolean NOT NULL DEFAULT false,
  premium_link_fee_inr integer NOT NULL DEFAULT 599 CHECK (premium_link_fee_inr BETWEEN 1 AND 50000),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.landing_page_settings TO anon, authenticated;
GRANT ALL ON public.landing_page_settings TO service_role;

ALTER TABLE public.landing_page_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landing settings readable by anyone"
  ON public.landing_page_settings FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins update landing settings"
  ON public.landing_page_settings FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));

INSERT INTO public.landing_page_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TRIGGER trg_landing_page_settings_updated_at
  BEFORE UPDATE ON public.landing_page_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_public_landing(_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _customer record;
  _settings record;
  _landing record;
  _vendor_kyc boolean;
  _vendor_shop_url text;
BEGIN
  SELECT id, name, phone, avatar_url, shop_name, referral_code
    INTO _customer
    FROM public.customers
   WHERE upper(referral_code) = upper(_code)
   LIMIT 1;

  IF _customer.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  SELECT * INTO _settings FROM public.merchant_link_settings WHERE user_id = _customer.id LIMIT 1;
  SELECT * INTO _landing FROM public.landing_page_settings WHERE id = 1;

  SELECT (kyc_status = 'verified'), NULLIF(public_shop_url, '')
    INTO _vendor_kyc, _vendor_shop_url
    FROM public.vendors WHERE user_id = _customer.id LIMIT 1;

  RETURN jsonb_build_object(
    'ok', true,
    'merchant', jsonb_build_object(
      'name', _customer.name,
      'shop_name', _customer.shop_name,
      'avatar_url', _customer.avatar_url,
      'verified', COALESCE(_vendor_kyc, false),
      'code', _customer.referral_code
    ),
    'links', jsonb_build_object(
      'poster_bg_url', _settings.poster_bg_url,
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
$$;

REVOKE ALL ON FUNCTION public.get_public_landing(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_landing(text) TO anon, authenticated;

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
    payment_enabled, payment_provider, payment_upi_id, payment_label,
    digital_shop_enabled, digital_shop_url,
    extra_links
  ) VALUES (
    _uid,
    NULLIF(_payload->>'poster_bg_url',''),
    COALESCE((_payload->>'play_store_enabled')::boolean, true),
    COALESCE((_payload->>'payment_enabled')::boolean, false),
    COALESCE(NULLIF(_payload->>'payment_provider',''), 'upi'),
    NULLIF(_payload->>'payment_upi_id',''),
    NULLIF(_payload->>'payment_label',''),
    COALESCE((_payload->>'digital_shop_enabled')::boolean, false),
    NULLIF(_payload->>'digital_shop_url',''),
    COALESCE(_payload->'extra_links', '[]'::jsonb)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    poster_bg_url = EXCLUDED.poster_bg_url,
    play_store_enabled = EXCLUDED.play_store_enabled,
    payment_enabled = EXCLUDED.payment_enabled,
    payment_provider = EXCLUDED.payment_provider,
    payment_upi_id = EXCLUDED.payment_upi_id,
    payment_label = EXCLUDED.payment_label,
    digital_shop_enabled = EXCLUDED.digital_shop_enabled,
    digital_shop_url = EXCLUDED.digital_shop_url,
    extra_links = EXCLUDED.extra_links,
    updated_at = now();

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_merchant_link_settings(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_merchant_link_settings(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_premium_links_unlocked(_payment_ref text)
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

  INSERT INTO public.merchant_link_settings (user_id, premium_unlocked, premium_paid_at, premium_payment_ref)
  VALUES (_uid, true, now(), _payment_ref)
  ON CONFLICT (user_id) DO UPDATE SET
    premium_unlocked = true,
    premium_paid_at = COALESCE(public.merchant_link_settings.premium_paid_at, now()),
    premium_payment_ref = COALESCE(public.merchant_link_settings.premium_payment_ref, EXCLUDED.premium_payment_ref),
    updated_at = now();

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.mark_premium_links_unlocked(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_premium_links_unlocked(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_landing_settings(_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  UPDATE public.landing_page_settings SET
    top_banner_url      = COALESCE(NULLIF(_payload->>'top_banner_url',''), top_banner_url),
    top_banner_link     = COALESCE(NULLIF(_payload->>'top_banner_link',''), top_banner_link),
    bottom_banner_url   = COALESCE(NULLIF(_payload->>'bottom_banner_url',''), bottom_banner_url),
    bottom_banner_link  = COALESCE(NULLIF(_payload->>'bottom_banner_link',''), bottom_banner_link),
    admob_publisher_id  = COALESCE(NULLIF(_payload->>'admob_publisher_id',''), admob_publisher_id),
    admob_top_slot      = COALESCE(NULLIF(_payload->>'admob_top_slot',''), admob_top_slot),
    admob_bottom_slot   = COALESCE(NULLIF(_payload->>'admob_bottom_slot',''), admob_bottom_slot),
    announcement_text   = COALESCE(NULLIF(_payload->>'announcement_text',''), announcement_text),
    announcement_active = COALESCE((_payload->>'announcement_active')::boolean, announcement_active),
    premium_link_fee_inr= COALESCE((_payload->>'premium_link_fee_inr')::integer, premium_link_fee_inr),
    updated_at = now()
  WHERE id = 1;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_landing_settings(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_landing_settings(jsonb) TO authenticated;
