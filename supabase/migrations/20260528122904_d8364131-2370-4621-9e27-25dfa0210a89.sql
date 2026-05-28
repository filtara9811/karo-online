
-- 1. Online flag + location timestamp for vendors
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS is_online boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS location_updated_at timestamptz;

-- 2. Batch-of-3 broadcast: send the next batch of nearest vendors within 15km
CREATE OR REPLACE FUNCTION public.broadcast_next_lead_batch(_lead_id uuid, _batch_size int DEFAULT 3)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _lead public.leads%ROWTYPE;
  _caller uuid := auth.uid();
  _sub_item_ids uuid[] := '{}';
  _vendor_ids uuid[] := '{}';
  _row record;
  _added int := 0;
  _accepted int;
  _cap int;
  _max_radius numeric := 15;
BEGIN
  IF _caller IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'auth_required');
  END IF;

  SELECT * INTO _lead FROM public.leads WHERE id = _lead_id FOR UPDATE;
  IF _lead.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;
  IF _caller <> _lead.customer_id AND NOT public.is_admin_user(_caller) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authorized');
  END IF;

  _accepted := COALESCE(_lead.accepted_count, 0);
  _cap := COALESCE(_lead.max_slots, 5);

  -- If already filled, nothing to do
  IF _accepted >= _cap THEN
    RETURN jsonb_build_object('ok', true, 'done', true, 'notified', 0,
      'accepted', _accepted, 'cap', _cap, 'vendor_ids', '[]'::jsonb);
  END IF;

  IF _lead.lat IS NULL OR _lead.lng IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'lead_no_location');
  END IF;

  SELECT COALESCE(array_agg(id), '{}') INTO _sub_item_ids
    FROM public.catalog_items
    WHERE category_id = _lead.sub_category_id AND is_active = true;

  -- Pick next batch of nearest vendors not yet notified for this lead
  FOR _row IN
    WITH already AS (
      SELECT vendor_id FROM public.lead_notifications WHERE lead_id = _lead_id
    ),
    candidates AS (
      SELECT
        v.user_id AS vendor_id,
        EXISTS (
          SELECT 1 FROM public.vendor_item_mappings m
           WHERE m.is_active = true
             AND m.vendor_id = v.user_id
             AND (_sub_item_ids = '{}' OR m.item_id = ANY(_sub_item_ids))
        ) AS mapped,
        (6371 * acos(GREATEST(-1, LEAST(1,
            cos(radians(_lead.lat)) * cos(radians(v.lat)) * cos(radians(v.lng) - radians(_lead.lng))
            + sin(radians(_lead.lat)) * sin(radians(v.lat))
        )))) AS dist_km,
        COALESCE(v.service_radius_km, 10) AS svc_radius,
        v.updated_at
      FROM public.vendors v
      WHERE v.user_id IS NOT NULL
        AND COALESCE(v.is_blocked, false) = false
        AND COALESCE(v.status, 'active') = 'active'
        AND v.lat IS NOT NULL AND v.lng IS NOT NULL
        AND v.user_id <> _lead.customer_id
        AND v.user_id NOT IN (SELECT vendor_id FROM already)
    )
    SELECT vendor_id, mapped, dist_km
      FROM candidates
     WHERE dist_km <= LEAST(_max_radius, svc_radius)
     ORDER BY mapped DESC, dist_km ASC, updated_at DESC NULLS LAST
     LIMIT GREATEST(_batch_size, 1)
  LOOP
    _vendor_ids := array_append(_vendor_ids, _row.vendor_id);
    _added := _added + 1;
  END LOOP;

  IF _added > 0 THEN
    INSERT INTO public.lead_notifications (lead_id, vendor_id, sub_category_name)
    SELECT _lead_id, vid, COALESCE(_lead.sub_category_name, 'Service')
    FROM unnest(_vendor_ids) AS vid
    ON CONFLICT (lead_id, vendor_id) DO NOTHING;

    UPDATE public.leads
       SET status = CASE WHEN status IN ('no_vendor_available') THEN 'searching_complete' ELSE status END,
           updated_at = now()
     WHERE id = _lead_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'done', _added = 0,
    'notified', _added,
    'accepted', _accepted,
    'cap', _cap,
    'vendor_ids', to_jsonb(_vendor_ids)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.broadcast_next_lead_batch(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.broadcast_next_lead_batch(uuid, int) TO service_role;

-- 3. Auto-accept trigger: when a notification arrives for a vendor with
--    auto_accept_leads = true, mark it accepted immediately (if lead not full).
CREATE OR REPLACE FUNCTION public.handle_lead_notification_auto_accept()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _auto boolean := false;
  _lead public.leads%ROWTYPE;
BEGIN
  SELECT COALESCE(auto_accept_leads, false) INTO _auto
    FROM public.vendors WHERE user_id = NEW.vendor_id;
  IF NOT _auto THEN
    RETURN NEW;
  END IF;

  SELECT * INTO _lead FROM public.leads WHERE id = NEW.lead_id FOR UPDATE;
  IF _lead.id IS NULL THEN RETURN NEW; END IF;
  IF COALESCE(_lead.accepted_count, 0) >= COALESCE(_lead.max_slots, 5) THEN
    RETURN NEW;
  END IF;
  IF NEW.vendor_id = ANY(COALESCE(_lead.accepted_vendor_ids, '{}')) THEN
    RETURN NEW;
  END IF;

  UPDATE public.lead_notifications
     SET status = 'accepted',
         responded_at = now(),
         vendor_started_at = COALESCE(vendor_started_at, now())
   WHERE id = NEW.id;

  UPDATE public.leads
     SET accepted_vendor_ids = array_append(COALESCE(accepted_vendor_ids, '{}'), NEW.vendor_id),
         accepted_count = COALESCE(accepted_count, 0) + 1,
         accepted_vendor_id = COALESCE(accepted_vendor_id, NEW.vendor_id),
         accepted_at = COALESCE(accepted_at, now()),
         status = CASE WHEN COALESCE(accepted_count,0) + 1 >= COALESCE(max_slots,5) THEN 'fulfilled' ELSE 'accepted' END,
         updated_at = now()
   WHERE id = NEW.lead_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lead_notif_auto_accept ON public.lead_notifications;
CREATE TRIGGER trg_lead_notif_auto_accept
  AFTER INSERT ON public.lead_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_lead_notification_auto_accept();
