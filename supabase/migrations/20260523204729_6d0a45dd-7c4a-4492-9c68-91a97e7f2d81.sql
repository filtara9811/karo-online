-- Restrict fraud-detection columns on referrals to admin-only reads.
-- RLS still allows referrer/referred to read the row, but Postgres column-level
-- privileges will block these specific columns for the 'authenticated' role.
REVOKE SELECT (ip_address, device_fingerprint) ON public.referrals FROM authenticated;
REVOKE SELECT (ip_address, device_fingerprint) ON public.referrals FROM anon;