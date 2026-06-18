
CREATE OR REPLACE FUNCTION public.admin_update_referral_settings(_patch jsonb)
RETURNS public.referral_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _row public.referral_settings;
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.referral_settings SET
    is_active                  = COALESCE((_patch->>'is_active')::boolean, is_active),
    base_reward_amount         = COALESCE((_patch->>'base_reward_amount')::numeric, base_reward_amount),
    level_1_pct                = COALESCE((_patch->>'level_1_pct')::numeric, level_1_pct),
    level_2_pct                = COALESCE((_patch->>'level_2_pct')::numeric, level_2_pct),
    max_split_pct              = COALESCE((_patch->>'max_split_pct')::numeric, max_split_pct),
    activation_fee             = COALESCE((_patch->>'activation_fee')::numeric, activation_fee),
    influencer_activation_fee  = COALESCE((_patch->>'influencer_activation_fee')::numeric, influencer_activation_fee),
    play_store_url             = COALESCE(_patch->>'play_store_url', play_store_url),
    banner_image_url           = COALESCE(_patch->>'banner_image_url', banner_image_url),
    banner_title               = COALESCE(_patch->>'banner_title', banner_title),
    banner_subtitle            = COALESCE(_patch->>'banner_subtitle', banner_subtitle),
    offer_active               = COALESCE((_patch->>'offer_active')::boolean, offer_active),
    offer_ends_at              = COALESCE((_patch->>'offer_ends_at')::timestamptz, offer_ends_at),
    offer_label                = COALESCE(_patch->>'offer_label', offer_label),
    royalty_tiers              = COALESCE(_patch->'royalty_tiers', royalty_tiers),
    updated_at                 = now()
  WHERE id = 1
  RETURNING * INTO _row;
  RETURN _row;
END;
$function$;
