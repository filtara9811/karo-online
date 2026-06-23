
-- Strip column-level SELECT on notify_emails from public roles.
-- Admins read via the service_role / is_admin_user policy path, which is unaffected.
REVOKE SELECT (notify_emails) ON public.web_forms FROM anon, authenticated;
