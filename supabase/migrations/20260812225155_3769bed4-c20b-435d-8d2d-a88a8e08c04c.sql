CREATE OR REPLACE FUNCTION public.admin_set_kyc_status(
  _kyc_id uuid,
  _status text,
  _notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _status NOT IN ('pending','todo','submitted','verified','approved','rejected') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  UPDATE public.kyc_verifications
  SET status = _status,
      reviewer_notes = _notes,
      reviewer_id = auth.uid(),
      verified_at = CASE WHEN _status IN ('verified','approved') THEN now() ELSE NULL END,
      updated_at = now()
  WHERE id = _kyc_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_kyc_status(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_kyc_status(uuid, text, text) TO authenticated;
