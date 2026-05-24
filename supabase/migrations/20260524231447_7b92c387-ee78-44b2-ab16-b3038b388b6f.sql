-- Restrict app_settings public read to a whitelist of non-sensitive keys.
-- media_library and any future internal keys require authentication.
DROP POLICY IF EXISTS "Anyone can view app settings" ON public.app_settings;

CREATE POLICY "Public can view safe app settings"
ON public.app_settings
FOR SELECT
TO anon
USING (key IN ('social_links', 'no_vendor_state', 'lead_defaults', 'vendor_app'));

CREATE POLICY "Authenticated can view app settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (true);