DROP POLICY IF EXISTS "public read live invite by token" ON public.staff_invites;
REVOKE SELECT ON public.staff_invites FROM anon;

CREATE OR REPLACE FUNCTION public.validate_staff_invite(_token text)
RETURNS TABLE (name text, email text, phone text, payout_model text, expires_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT si.name, si.email, si.phone, si.payout_model, si.expires_at
  FROM public.staff_invites si
  WHERE si.invite_token = _token AND si.used_at IS NULL AND si.expires_at > now()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.validate_staff_invite(text) FROM public;
GRANT EXECUTE ON FUNCTION public.validate_staff_invite(text) TO anon, authenticated;