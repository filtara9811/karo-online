CREATE INDEX IF NOT EXISTS idx_referral_codes_code_upper ON public.referral_codes (upper(code));
CREATE INDEX IF NOT EXISTS idx_customers_referral_code_upper ON public.customers (upper(referral_code)) WHERE referral_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qr_projects_slug ON public.qr_projects (slug);
CREATE INDEX IF NOT EXISTS idx_vendors_verified_trade ON public.vendors (trade, created_at DESC) WHERE verified;