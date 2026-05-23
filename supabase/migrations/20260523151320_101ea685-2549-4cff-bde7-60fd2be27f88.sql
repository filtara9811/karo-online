-- Seed the empty no_vendor_state setting so admin can fill it in.
INSERT INTO public.app_settings (key, value)
VALUES ('no_vendor_state', '{"video_url": "", "message": "Yahan vendor available nahi hai. Thodi der baad try kariye."}'::jsonb)
ON CONFLICT (key) DO NOTHING;