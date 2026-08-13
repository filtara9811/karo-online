CREATE TABLE IF NOT EXISTS public.oneqr_tutorial_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL UNIQUE,
  title text NOT NULL DEFAULT '',
  caption text NOT NULL DEFAULT '',
  youtube_url text,
  video_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.oneqr_tutorial_videos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.oneqr_tutorial_videos TO authenticated;
GRANT ALL ON public.oneqr_tutorial_videos TO service_role;

ALTER TABLE public.oneqr_tutorial_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone reads active tutorial videos" ON public.oneqr_tutorial_videos
  FOR SELECT TO anon, authenticated USING (is_active = true OR public.is_admin_user(auth.uid()));

CREATE POLICY "admins insert tutorial videos" ON public.oneqr_tutorial_videos
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_user(auth.uid()));
CREATE POLICY "admins update tutorial videos" ON public.oneqr_tutorial_videos
  FOR UPDATE TO authenticated USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));
CREATE POLICY "admins delete tutorial videos" ON public.oneqr_tutorial_videos
  FOR DELETE TO authenticated USING (public.is_admin_user(auth.uid()));

CREATE TRIGGER oneqr_tutorial_videos_touch
  BEFORE UPDATE ON public.oneqr_tutorial_videos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.shop_threads REPLICA IDENTITY FULL;
ALTER TABLE public.shop_thread_messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.shop_threads;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.shop_thread_messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;