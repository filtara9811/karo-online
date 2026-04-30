INSERT INTO public.user_roles (user_id, role)
VALUES ('6c46ec4d-97f3-4fca-8333-f53a65637a3a', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;