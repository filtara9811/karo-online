GRANT EXECUTE ON FUNCTION public.is_admin_user(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated;