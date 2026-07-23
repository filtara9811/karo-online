CREATE OR REPLACE FUNCTION public.customer_approve_vendor(_lead_id uuid, _vendor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _lead public.leads%ROWTYPE;
  _notification_status text;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'auth_required');
  END IF;

  SELECT * INTO _lead FROM public.leads WHERE id = _lead_id FOR UPDATE;
  IF _lead.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF _uid <> _lead.customer_id AND NOT public.is_admin_user(_uid) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authorized');
  END IF;

  SELECT n.status INTO _notification_status
  FROM public.lead_notifications n
  WHERE n.lead_id = _lead_id
    AND n.vendor_id = _vendor_id
  ORDER BY n.responded_at DESC NULLS LAST, n.created_at DESC NULLS LAST
  LIMIT 1;

  IF NOT (
    _vendor_id = ANY(COALESCE(_lead.accepted_vendor_ids, ARRAY[]::uuid[]))
    OR _notification_status = 'accepted'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'vendor_not_accepted');
  END IF;

  PERFORM set_config('app.lead_system_update', 'on', true);

  UPDATE public.leads
    SET customer_approved_vendor_id = _vendor_id,
        accepted_vendor_id = COALESCE(accepted_vendor_id, _vendor_id),
        accepted_vendor_ids = CASE
          WHEN _vendor_id = ANY(COALESCE(accepted_vendor_ids, ARRAY[]::uuid[])) THEN accepted_vendor_ids
          ELSE array_append(COALESCE(accepted_vendor_ids, ARRAY[]::uuid[]), _vendor_id)
        END,
        accepted_count = GREATEST(COALESCE(accepted_count, 0), cardinality(CASE
          WHEN _vendor_id = ANY(COALESCE(accepted_vendor_ids, ARRAY[]::uuid[])) THEN accepted_vendor_ids
          ELSE array_append(COALESCE(accepted_vendor_ids, ARRAY[]::uuid[]), _vendor_id)
        END)),
        accepted_at = COALESCE(accepted_at, now()),
        status = 'in_progress',
        updated_at = now()
    WHERE id = _lead_id;

  UPDATE public.lead_notifications
    SET status = 'accepted',
        responded_at = COALESCE(responded_at, now()),
        vendor_started_at = COALESCE(vendor_started_at, now())
    WHERE lead_id = _lead_id
      AND vendor_id = _vendor_id;

  RETURN jsonb_build_object('ok', true, 'vendor_id', _vendor_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.customer_approve_vendor(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.customer_approve_vendor(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.customer_approve_vendor(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.customer_approve_vendor(uuid, uuid) TO service_role;