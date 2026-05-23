
CREATE OR REPLACE FUNCTION public.vendor_claim_by_phone(_phone text)
RETURNS TABLE(
  user_id uuid,
  business_name text,
  whatsapp text,
  status text,
  relinked boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _digits text := regexp_replace(COALESCE(_phone,''), '\D', '', 'g');
  _last10 text;
  _vendor_row public.vendors%ROWTYPE;
  _relinked boolean := false;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF length(_digits) < 10 THEN
    RETURN;
  END IF;
  _last10 := right(_digits, 10);

  -- 1) Already owns a vendor row → just return it
  SELECT * INTO _vendor_row FROM public.vendors WHERE vendors.user_id = _uid LIMIT 1;
  IF FOUND THEN
    user_id := _vendor_row.user_id;
    business_name := _vendor_row.business_name;
    whatsapp := _vendor_row.whatsapp;
    status := _vendor_row.status;
    relinked := false;
    RETURN NEXT;
    RETURN;
  END IF;

  -- 2) Find vendor by phone (last 10 digits)
  SELECT * INTO _vendor_row FROM public.vendors
   WHERE right(regexp_replace(COALESCE(whatsapp,''), '\D', '', 'g'), 10) = _last10
   ORDER BY created_at DESC
   LIMIT 1;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- 3) Relink to current user (only if free / different)
  IF _vendor_row.user_id <> _uid THEN
    -- Make sure no other vendor row already exists for _uid (defensive)
    IF NOT EXISTS (SELECT 1 FROM public.vendors WHERE vendors.user_id = _uid) THEN
      UPDATE public.vendors SET user_id = _uid, updated_at = now()
        WHERE id = _vendor_row.id;
      _relinked := true;
      _vendor_row.user_id := _uid;
    END IF;
  END IF;

  user_id := _vendor_row.user_id;
  business_name := _vendor_row.business_name;
  whatsapp := _vendor_row.whatsapp;
  status := _vendor_row.status;
  relinked := _relinked;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.vendor_claim_by_phone(text) TO authenticated;
