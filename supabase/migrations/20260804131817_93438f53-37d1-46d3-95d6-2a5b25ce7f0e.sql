DROP POLICY IF EXISTS "Anyone can view active subscription settings" ON public.vendor_subscription_settings;

REVOKE SELECT ON public.vendor_subscription_settings FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_subscription_settings TO authenticated;
GRANT ALL ON public.vendor_subscription_settings TO service_role;

CREATE OR REPLACE VIEW public.vendor_subscription_public AS
SELECT id, plan_name, headline, sub_headline, price_paise, original_price_paise,
       trial_price_paise, trial_days, trial_enabled, auto_deduct_after_trial,
       features, payment_gateway, is_active, updated_at
FROM public.vendor_subscription_settings
WHERE is_active = true;

GRANT SELECT ON public.vendor_subscription_public TO anon, authenticated;