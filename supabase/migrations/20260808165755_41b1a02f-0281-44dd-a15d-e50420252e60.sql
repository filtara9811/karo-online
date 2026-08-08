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
    NEW.response_payload := NULL;
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status NOT IN ('pending','todo','submitted') THEN
    RAISE EXCEPTION 'Only admins can change KYC status to %', NEW.status;
  END IF;

  -- Review outcome + provider/verification metadata is admin-only, always.
  NEW.reviewer_id := OLD.reviewer_id;
  NEW.reviewer_notes := OLD.reviewer_notes;
  NEW.verified_at := OLD.verified_at;
  NEW.response_payload := OLD.response_payload;
  NEW.provider := OLD.provider;
  NEW.method := OLD.method;
  NEW.reference_id := OLD.reference_id;
  NEW.subject_user_id := OLD.subject_user_id;
  NEW.subject_type := OLD.subject_type;
  NEW.check_type := OLD.check_type;

  -- Once submitted or verified, the submission payload is frozen too.
  IF OLD.status IN ('submitted','verified') THEN
    NEW.document_number := OLD.document_number;
    NEW.document_urls := OLD.document_urls;
    NEW.request_payload := OLD.request_payload;
  END IF;

  RETURN NEW;
END; $function$;