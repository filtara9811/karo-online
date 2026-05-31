INSERT INTO public.app_settings (key, value)
VALUES ('welcome_video', '{"video_url": "", "message": "Welcome to Karo Online — let''s get started!"}'::jsonb)
ON CONFLICT (key) DO NOTHING;