-- 1) Table
CREATE TABLE IF NOT EXISTS public.category_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suggested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  category_name text NOT NULL,
  subcategory_name text,
  child_category_name text,
  note text,
  image_url text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT category_suggestions_status_chk CHECK (status IN ('pending','approved','rejected')),
  CONSTRAINT category_suggestions_name_len CHECK (char_length(category_name) BETWEEN 1 AND 120),
  CONSTRAINT category_suggestions_sub_len CHECK (subcategory_name IS NULL OR char_length(subcategory_name) <= 120),
  CONSTRAINT category_suggestions_child_len CHECK (child_category_name IS NULL OR char_length(child_category_name) <= 120),
  CONSTRAINT category_suggestions_note_len CHECK (note IS NULL OR char_length(note) <= 600)
);

-- 2) GRANTs (auth-only; admins use service-role for review writes via app)
GRANT SELECT, INSERT, UPDATE ON public.category_suggestions TO authenticated;
GRANT ALL ON public.category_suggestions TO service_role;

-- 3) RLS
ALTER TABLE public.category_suggestions ENABLE ROW LEVEL SECURITY;

-- Users see their own suggestions
CREATE POLICY "Users read own suggestions"
ON public.category_suggestions FOR SELECT TO authenticated
USING (suggested_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Users create their own suggestions
CREATE POLICY "Users insert own suggestions"
ON public.category_suggestions FOR INSERT TO authenticated
WITH CHECK (suggested_by = auth.uid());

-- Admins update (review) any
CREATE POLICY "Admins update suggestions"
ON public.category_suggestions FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4) updated_at trigger
CREATE TRIGGER trg_category_suggestions_updated_at
BEFORE UPDATE ON public.category_suggestions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Index for admin review list
CREATE INDEX IF NOT EXISTS category_suggestions_status_created_idx
  ON public.category_suggestions (status, created_at DESC);

-- 6) Storage policy: allow signed-in users to upload to catalog/suggestions/*
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='Authenticated can upload category suggestion photos'
  ) THEN
    CREATE POLICY "Authenticated can upload category suggestion photos"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'catalog' AND (storage.foldername(name))[1] = 'suggestions');
  END IF;
END $$;