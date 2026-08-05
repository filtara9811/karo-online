-- 1) KYC: prevent subjects from tampering with submitted document data / review fields
CREATE OR REPLACE FUNCTION public.kyc_verifications_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF public._is_admin() THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS NOT NULL AND NEW.status NOT IN ('pending','todo','submitted') THEN
      RAISE EXCEPTION 'Only admins can set KYC status to %', NEW.status;
    END IF;
    NEW.reviewer_id := NULL;
    NEW.reviewer_notes := NULL;
    NEW.verified_at := NULL;
    NEW.response_payload := OLD_NULL_JSONB();
    RETURN NEW;
  END IF;

  -- UPDATE by non-admin
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status NOT IN ('pending','todo','submitted') THEN
    RAISE EXCEPTION 'Only admins can change KYC status to %', NEW.status;
  END IF;

  -- Review-only fields are never writable by the subject
  NEW.reviewer_id := OLD.reviewer_id;
  NEW.reviewer_notes := OLD.reviewer_notes;
  NEW.verified_at := OLD.verified_at;
  NEW.response_payload := OLD.response_payload;
  NEW.subject_user_id := OLD.subject_user_id;
  NEW.subject_type := OLD.subject_type;
  NEW.check_type := OLD.check_type;

  -- Once submitted or verified, submitted evidence is frozen for the subject
  IF OLD.status IN ('submitted','verified') THEN
    NEW.document_number := OLD.document_number;
    NEW.document_urls := OLD.document_urls;
    NEW.request_payload := OLD.request_payload;
    NEW.provider := OLD.provider;
    NEW.method := OLD.method;
    NEW.reference_id := OLD.reference_id;
  END IF;

  RETURN NEW;
END; $function$;

-- 2) Referral visits: remove public direct-insert of visitor PII (RPC handles it)
DROP POLICY IF EXISTS "visits_insert_validated" ON public.referral_link_visits;

CREATE POLICY "visits_insert_own_no_pii"
ON public.referral_link_visits
FOR INSERT
TO authenticated
WITH CHECK (
  code IS NOT NULL
  AND referrer_user_id IS NOT NULL
  AND referrer_user_id = public.referral_code_owner(code)
  AND visitor_name IS NULL
  AND visitor_phone IS NULL
);

-- 3) Web form submissions: only accept submissions for existing active forms
CREATE OR REPLACE FUNCTION public.web_form_is_active(_form_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.web_forms w
    WHERE w.id = _form_id AND w.is_active = true
  );
$function$;

DROP POLICY IF EXISTS "anyone submit" ON public.web_form_submissions;

CREATE POLICY "submit to active form"
ON public.web_form_submissions
FOR INSERT
WITH CHECK (form_id IS NOT NULL AND public.web_form_is_active(form_id));