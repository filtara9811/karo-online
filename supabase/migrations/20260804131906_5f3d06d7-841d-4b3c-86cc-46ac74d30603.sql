ALTER VIEW public.vendor_subscription_public SET (security_invoker = true);

-- Column-level grant: anon may read plan info but never upi_id
GRANT SELECT (id, plan_name, headline, sub_headline, price_paise, original_price_paise,
       trial_price_paise, trial_days, trial_enabled, auto_deduct_after_trial,
       features, payment_gateway, is_active, updated_at)
  ON public.vendor_subscription_settings TO anon;

CREATE POLICY "Public can view active plan info"
  ON public.vendor_subscription_settings
  FOR SELECT TO anon
  USING (is_active = true);