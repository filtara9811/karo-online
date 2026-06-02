-- Vendor-side lead status pipeline: pending → in_process → success / rejected
-- Lets a vendor move ANY of their own lead_notifications between states,
-- and (for the success case) marks the underlying lead as completed.

CREATE OR REPLACE FUNCTION public.set_my_lead_status(
  _lead_id uuid,
  _status  text  -- one of: 'pending' | 'in_process' | 'success' | 'rejected'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_notif public.lead_notifications%ROWTYPE;
  v_new_notif_status text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  SELECT * INTO v_notif
  FROM public.lead_notifications
  WHERE lead_id = _lead_id AND vendor_id = v_uid
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'notification_not_found');
  END IF;

  -- Map UI status → notification status
  v_new_notif_status := CASE _status
    WHEN 'pending'    THEN 'pending'
    WHEN 'in_process' THEN 'accepted'
    WHEN 'success'    THEN 'accepted'
    WHEN 'rejected'   THEN 'rejected'
    ELSE NULL
  END;

  IF v_new_notif_status IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_status');
  END IF;

  UPDATE public.lead_notifications
    SET status = v_new_notif_status,
        responded_at = CASE WHEN v_new_notif_status <> 'pending' THEN now() ELSE NULL END,
        vendor_started_at = CASE
          WHEN _status IN ('in_process', 'success') THEN COALESCE(vendor_started_at, now())
          WHEN _status = 'pending' THEN NULL
          ELSE vendor_started_at
        END
    WHERE id = v_notif.id;

  -- Keep leads.accepted_vendor_ids in sync
  IF _status IN ('in_process', 'success') THEN
    UPDATE public.leads
      SET accepted_vendor_ids =
        CASE WHEN v_uid = ANY(COALESCE(accepted_vendor_ids, ARRAY[]::uuid[]))
             THEN accepted_vendor_ids
             ELSE COALESCE(accepted_vendor_ids, ARRAY[]::uuid[]) || v_uid
        END,
        accepted_count = array_length(
          CASE WHEN v_uid = ANY(COALESCE(accepted_vendor_ids, ARRAY[]::uuid[]))
               THEN accepted_vendor_ids
               ELSE COALESCE(accepted_vendor_ids, ARRAY[]::uuid[]) || v_uid
          END, 1
        )
      WHERE id = _lead_id;
  ELSIF _status = 'rejected' THEN
    UPDATE public.leads
      SET accepted_vendor_ids = array_remove(COALESCE(accepted_vendor_ids, ARRAY[]::uuid[]), v_uid)
      WHERE id = _lead_id;
  END IF;

  -- Mark whole lead completed only on success
  IF _status = 'success' THEN
    UPDATE public.leads SET status = 'completed' WHERE id = _lead_id;
  ELSIF _status = 'in_process' THEN
    UPDATE public.leads SET status = 'accepted' WHERE id = _lead_id AND status = 'completed';
  END IF;

  RETURN jsonb_build_object('ok', true, 'status', _status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_my_lead_status(uuid, text) TO authenticated;