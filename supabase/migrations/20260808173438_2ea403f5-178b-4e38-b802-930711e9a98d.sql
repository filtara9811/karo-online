ALTER TABLE public.qr_landing_themes ADD COLUMN IF NOT EXISTS style text NOT NULL DEFAULT 'shop';

UPDATE public.qr_landing_themes SET style='shop', name='Shop Catalog · Amber', description='Story media + featured products, warm amber look' WHERE key='classic_amber';
UPDATE public.qr_landing_themes SET style='shop', name='Shop Catalog · Minimal', description='Clean white shop layout with product cards' WHERE key='minimal_white';
UPDATE public.qr_landing_themes SET style='chat', name='Chat Style · Green', description='WhatsApp-like welcome chat with service tiles' WHERE key='fresh_green';
UPDATE public.qr_landing_themes SET style='reels', name='Reels Style · Royal', description='Full screen video reels, dark premium look' WHERE key='royal_dark';
UPDATE public.qr_landing_themes SET style='reels', name='Reels Style · Neon', description='Full screen reels with neon gradient accents' WHERE key='neon_gradient';

CREATE OR REPLACE FUNCTION public.get_qr_landing_themes()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _premium boolean := false;
  _current text := 'classic_amber';
  _accent text;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'auth_required');
  END IF;

  SELECT COALESCE(is_premium, false) OR (subscription_expires_at IS NOT NULL AND subscription_expires_at > now())
    INTO _premium FROM public.vendors WHERE user_id = _uid LIMIT 1;

  SELECT COALESCE(landing_theme_key, 'classic_amber'), landing_theme_accent
    INTO _current, _accent FROM public.merchant_link_settings WHERE user_id = _uid LIMIT 1;

  RETURN jsonb_build_object(
    'ok', true,
    'premium', COALESCE(_premium, false),
    'current', COALESCE(_current, 'classic_amber'),
    'accent', _accent,
    'themes', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'key', t.key, 'name', t.name, 'description', t.description, 'preset', t.preset,
        'style', t.style,
        'accent_color', t.accent_color, 'bg_from', t.bg_from, 'bg_to', t.bg_to,
        'is_premium', t.is_premium
      ) ORDER BY t.sort_order)
      FROM public.qr_landing_themes t WHERE t.is_active
    ), '[]'::jsonb)
  );
END;
$function$;