
DROP POLICY IF EXISTS "Public can view safe app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Authenticated can view safe app settings" ON public.app_settings;

CREATE POLICY "Public can view safe app settings"
ON public.app_settings FOR SELECT TO anon
USING (key = ANY (ARRAY['social_links','no_vendor_state','lead_defaults','vendor_app','vendor_onboarding_video']));

CREATE POLICY "Authenticated can view safe app settings"
ON public.app_settings FOR SELECT TO authenticated
USING ((key = ANY (ARRAY['social_links','no_vendor_state','lead_defaults','vendor_app','vendor_onboarding_video'])) OR is_admin_user(auth.uid()));
