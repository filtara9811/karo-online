
-- Fix 1: Prevent any authenticated user from inserting their own staff_profiles row.
-- Only admins should be able to create staff records.
DROP POLICY IF EXISTS "Staff insert own profile" ON public.staff_profiles;

CREATE POLICY "Admins insert staff profiles" ON public.staff_profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_user(auth.uid()));

-- Fix 2: Defense-in-depth for vendors table — explicitly revoke anon access to
-- sensitive PII columns. RLS already restricts SELECT to owners/admins, but
-- column-level revokes block any accidental anon read path (e.g. PostgREST
-- column expansion, future policy mistakes).
REVOKE SELECT (aadhaar, pan, gst, whatsapp, manager_email, email, admin_notes, tags, assigned_to)
  ON public.vendors FROM anon;

-- Fix 3: Hide admin notification emails on web_forms from anonymous readers.
-- The "anyone read active forms" policy must stay so the public can render
-- forms, but notify_emails must never reach the browser of an unauthenticated
-- visitor. Revoke column-level SELECT from anon; authenticated/admin reads
-- continue to work for the admin UI.
REVOKE SELECT (notify_emails) ON public.web_forms FROM anon;
