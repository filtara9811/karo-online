CREATE TABLE public.vendor_scan_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kinds TEXT[] NOT NULL DEFAULT '{}',
  thumbnail TEXT,
  extracted JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_scan_history TO authenticated;
GRANT ALL ON public.vendor_scan_history TO service_role;

ALTER TABLE public.vendor_scan_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vsh_owner_select" ON public.vendor_scan_history
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "vsh_owner_insert" ON public.vendor_scan_history
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "vsh_owner_delete" ON public.vendor_scan_history
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX vendor_scan_history_user_created_idx
  ON public.vendor_scan_history (user_id, created_at DESC);