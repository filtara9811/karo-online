DROP POLICY IF EXISTS "anyone read active forms" ON public.web_forms;
CREATE POLICY "authenticated read active forms" ON public.web_forms FOR SELECT TO authenticated USING (is_active = true);