
-- 1) Add marketplace columns to leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS is_marketplace boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketplace_reason text,
  ADD COLUMN IF NOT EXISTS marketplace_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_leads_marketplace
  ON public.leads (is_marketplace, created_at DESC)
  WHERE is_marketplace = true;

-- 2) Finalize function — promote to marketplace if under capacity
CREATE OR REPLACE FUNCTION public.finalize_lead_marketplace(_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead public.leads%ROWTYPE;
  v_reason text;
BEGIN
  SELECT * INTO v_lead FROM public.leads WHERE id = _lead_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  -- Already finalized or terminal
  IF v_lead.is_marketplace OR v_lead.status IN ('fulfilled', 'cancelled', 'expired') THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'status', v_lead.status, 'is_marketplace', v_lead.is_marketplace);
  END IF;

  -- Under capacity → marketplace
  IF COALESCE(v_lead.accepted_count, 0) < COALESCE(v_lead.max_slots, 5) THEN
    IF COALESCE(v_lead.accepted_count, 0) = 0 THEN
      -- Was any vendor notified at all?
      IF NOT EXISTS (SELECT 1 FROM public.lead_notifications WHERE lead_id = _lead_id) THEN
        v_reason := 'zero_vendors';
      ELSE
        v_reason := 'no_acceptance';
      END IF;
    ELSE
      v_reason := 'under_capacity';
    END IF;

    UPDATE public.leads
      SET is_marketplace = true,
          marketplace_reason = v_reason,
          marketplace_at = now()
      WHERE id = _lead_id;

    RETURN jsonb_build_object('ok', true, 'moved', true, 'reason', v_reason);
  END IF;

  RETURN jsonb_build_object('ok', true, 'moved', false, 'reason', 'capacity_met');
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_lead_marketplace(uuid) TO service_role;

-- 3) Update autobroadcast trigger to schedule finalize + zero-vendor short-circuit
CREATE OR REPLACE FUNCTION public.tg_leads_autobroadcast()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_vendor_ids jsonb;
  v_count int := 0;
BEGIN
  IF NEW.status IS DISTINCT FROM 'new' THEN
    RETURN NEW;
  END IF;

  -- Batch 1 — immediate, 5 vendors
  BEGIN
    v_result := public.broadcast_next_lead_batch(NEW.id, 5, 0);
    v_vendor_ids := COALESCE(v_result->'vendor_ids', '[]'::jsonb);
    v_count := COALESCE((v_result->>'notified')::int, jsonb_array_length(v_vendor_ids));

    INSERT INTO public.lead_broadcast_schedule (lead_id, batch_no, batch_size, batch_offset, fire_at, processed_at, result)
    VALUES (NEW.id, 1, 5, 0, now(), now(), v_result);

    BEGIN
      PERFORM net.http_post(
        url := public._lead_whatsapp_webhook_url(),
        headers := '{"Content-Type":"application/json"}'::jsonb,
        body := jsonb_build_object('lead_id', NEW.id, 'vendor_ids', v_vendor_ids, 'batch_no', 1)
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'whatsapp dispatch failed (batch1) for lead %: %', NEW.id, SQLERRM;
    END;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'autobroadcast b1 failed for lead %: %', NEW.id, SQLERRM;
  END;

  -- If first batch hit zero vendors AND no prior notifications exist, push to marketplace now
  IF v_count = 0 AND NOT EXISTS (SELECT 1 FROM public.lead_notifications WHERE lead_id = NEW.id) THEN
    UPDATE public.leads
      SET is_marketplace = true,
          marketplace_reason = 'zero_vendors',
          marketplace_at = now()
      WHERE id = NEW.id;
    -- Still schedule later batches in case vendors come online; finalize will re-check
  END IF;

  -- Batch 2 — +30s
  INSERT INTO public.lead_broadcast_schedule (lead_id, batch_no, batch_size, batch_offset, fire_at)
  VALUES (NEW.id, 2, 3, 5, now() + interval '30 seconds');

  -- Batch 3 — +60s
  INSERT INTO public.lead_broadcast_schedule (lead_id, batch_no, batch_size, batch_offset, fire_at)
  VALUES (NEW.id, 3, 2, 8, now() + interval '60 seconds');

  -- Finalize batch — +120s (batch_no = 99 sentinel for finalize)
  INSERT INTO public.lead_broadcast_schedule (lead_id, batch_no, batch_size, batch_offset, fire_at)
  VALUES (NEW.id, 99, 0, 0, now() + interval '120 seconds');

  RETURN NEW;
END;
$$;

-- 4) Update scheduler to honor finalize batch
CREATE OR REPLACE FUNCTION public.process_lead_broadcast_schedule()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_result jsonb;
  v_done integer := 0;
  v_lead public.leads%ROWTYPE;
BEGIN
  FOR r IN
    SELECT * FROM public.lead_broadcast_schedule
    WHERE processed_at IS NULL AND fire_at <= now()
    ORDER BY fire_at ASC
    LIMIT 25
    FOR UPDATE SKIP LOCKED
  LOOP
    SELECT * INTO v_lead FROM public.leads WHERE id = r.lead_id;
    IF NOT FOUND OR v_lead.status IN ('fulfilled', 'cancelled', 'expired') THEN
      UPDATE public.lead_broadcast_schedule
        SET processed_at = now(), result = jsonb_build_object('skipped', true, 'reason', COALESCE(v_lead.status, 'not_found'))
        WHERE id = r.id;
      v_done := v_done + 1;
      CONTINUE;
    END IF;

    -- Finalize sentinel
    IF r.batch_no = 99 THEN
      BEGIN
        v_result := public.finalize_lead_marketplace(r.lead_id);
      EXCEPTION WHEN OTHERS THEN
        v_result := jsonb_build_object('ok', false, 'error', SQLERRM);
      END;

      UPDATE public.lead_broadcast_schedule
        SET processed_at = now(), result = v_result
        WHERE id = r.id;
      v_done := v_done + 1;
      CONTINUE;
    END IF;

    BEGIN
      v_result := public.broadcast_next_lead_batch(r.lead_id, r.batch_size::integer, r.batch_offset::integer);
    EXCEPTION WHEN OTHERS THEN
      v_result := jsonb_build_object('ok', false, 'error', SQLERRM);
    END;

    UPDATE public.lead_broadcast_schedule
      SET processed_at = now(), result = v_result
      WHERE id = r.id;

    BEGIN
      PERFORM net.http_post(
        url := public._lead_whatsapp_webhook_url(),
        headers := '{"Content-Type":"application/json"}'::jsonb,
        body := jsonb_build_object(
          'lead_id', r.lead_id,
          'vendor_ids', COALESCE(v_result->'vendor_ids', '[]'::jsonb),
          'batch_no', r.batch_no
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'whatsapp dispatch failed (batch%) for lead %: %', r.batch_no, r.lead_id, SQLERRM;
    END;

    v_done := v_done + 1;
  END LOOP;
  RETURN v_done;
END;
$$;

-- 5) Vendor function — list marketplace leads (filtered server-side by group/area approximation)
CREATE OR REPLACE FUNCTION public.list_marketplace_leads_for_vendor()
RETURNS TABLE (
  id uuid,
  sub_category_name text,
  item_names text[],
  note text,
  images text[],
  address text,
  lat double precision,
  lng double precision,
  group_name text,
  accepted_count int,
  max_slots int,
  lead_price_inr numeric,
  marketplace_reason text,
  marketplace_at timestamptz,
  created_at timestamptz,
  distance_km numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vendor public.vendors%ROWTYPE;
BEGIN
  SELECT * INTO v_vendor FROM public.vendors WHERE user_id = auth.uid();
  IF NOT FOUND THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    l.id,
    l.sub_category_name,
    l.item_names,
    l.note,
    l.images,
    l.address,
    l.lat,
    l.lng,
    l.group_name,
    l.accepted_count,
    l.max_slots,
    l.lead_price_inr,
    l.marketplace_reason,
    l.marketplace_at,
    l.created_at,
    CASE
      WHEN l.lat IS NOT NULL AND l.lng IS NOT NULL
        AND v_vendor.lat IS NOT NULL AND v_vendor.lng IS NOT NULL
      THEN ROUND(
        (6371 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians(v_vendor.lat)) * cos(radians(l.lat))
            * cos(radians(l.lng) - radians(v_vendor.lng))
            + sin(radians(v_vendor.lat)) * sin(radians(l.lat))
          ))
        ))::numeric, 2)
      ELSE NULL
    END AS distance_km
  FROM public.leads l
  WHERE l.is_marketplace = true
    AND l.status NOT IN ('fulfilled', 'cancelled', 'expired')
    AND COALESCE(l.accepted_count, 0) < COALESCE(l.max_slots, 5)
    AND NOT (auth.uid() = ANY (COALESCE(l.accepted_vendor_ids, ARRAY[]::uuid[])))
    AND (
      v_vendor.group_name IS NULL
      OR l.group_name IS NULL
      OR l.group_name = v_vendor.group_name
    )
  ORDER BY l.marketplace_at DESC NULLS LAST, l.created_at DESC
  LIMIT 100;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_marketplace_leads_for_vendor() TO authenticated;

-- 6) Vendor claim marketplace lead — wraps accept path
CREATE OR REPLACE FUNCTION public.claim_marketplace_lead(_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vendor uuid := auth.uid();
  v_lead public.leads%ROWTYPE;
BEGIN
  IF v_vendor IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'auth_required');
  END IF;

  SELECT * INTO v_lead FROM public.leads WHERE id = _lead_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF NOT v_lead.is_marketplace THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_in_marketplace');
  END IF;

  IF COALESCE(v_lead.accepted_count, 0) >= COALESCE(v_lead.max_slots, 5) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'cap_reached');
  END IF;

  IF v_vendor = ANY (COALESCE(v_lead.accepted_vendor_ids, ARRAY[]::uuid[])) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_accepted');
  END IF;

  -- Insert a pending notification so accept_lead can pick it up cleanly
  INSERT INTO public.lead_notifications (lead_id, vendor_id, sub_category_name, status, auto_accept_at)
  VALUES (_lead_id, v_vendor, v_lead.sub_category_name, 'pending', now() + interval '60 seconds')
  ON CONFLICT (lead_id, vendor_id) DO UPDATE SET status = 'pending', responded_at = NULL;

  RETURN public.accept_lead(_lead_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_marketplace_lead(uuid) TO authenticated;

-- 7) Admin re-broadcast — re-runs match for the lead and schedules another finalize
CREATE OR REPLACE FUNCTION public.admin_rebroadcast_lead(_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Clear marketplace flag so finalize can re-evaluate
  UPDATE public.leads
    SET is_marketplace = false,
        marketplace_reason = NULL,
        marketplace_at = NULL,
        status = CASE WHEN status IN ('fulfilled','cancelled','expired') THEN status ELSE 'new' END
    WHERE id = _lead_id;

  BEGIN
    v_result := public.broadcast_next_lead_batch(_lead_id, 10, 0);
  EXCEPTION WHEN OTHERS THEN
    v_result := jsonb_build_object('ok', false, 'error', SQLERRM);
  END;

  INSERT INTO public.lead_broadcast_schedule (lead_id, batch_no, batch_size, batch_offset, fire_at, processed_at, result)
  VALUES (_lead_id, 1, 10, 0, now(), now(), v_result);

  -- Schedule new finalize
  INSERT INTO public.lead_broadcast_schedule (lead_id, batch_no, batch_size, batch_offset, fire_at)
  VALUES (_lead_id, 99, 0, 0, now() + interval '120 seconds');

  RETURN jsonb_build_object('ok', true, 'rebroadcast', v_result);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_rebroadcast_lead(uuid) TO authenticated;

-- 8) Admin dashboard listing
CREATE OR REPLACE FUNCTION public.admin_list_leads_dashboard(_bucket text DEFAULT 'all', _limit int DEFAULT 100)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows jsonb;
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_jsonb(t) ORDER BY t.created_at DESC), '[]'::jsonb)
    INTO v_rows
  FROM (
    SELECT
      l.id, l.customer_id, l.customer_name, l.customer_phone,
      l.sub_category_name, l.item_names, l.note, l.images, l.address, l.lat, l.lng,
      l.group_name, l.status, l.is_marketplace, l.marketplace_reason, l.marketplace_at,
      l.accepted_count, l.max_slots, l.accepted_vendor_ids, l.created_at,
      (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'vendor_id', n.vendor_id,
          'status', n.status,
          'vendor_note', n.vendor_note,
          'responded_at', n.responded_at
        )), '[]'::jsonb)
        FROM public.lead_notifications n
        WHERE n.lead_id = l.id
      ) AS notifications,
      (
        SELECT COUNT(*) FROM public.lead_notifications n
        WHERE n.lead_id = l.id AND n.status = 'pending'
      ) AS pending_count,
      (
        SELECT COUNT(*) FROM public.lead_notifications n
        WHERE n.lead_id = l.id AND n.status = 'rejected'
      ) AS rejected_count
    FROM public.leads l
    WHERE
      CASE _bucket
        WHEN 'active'      THEN l.is_marketplace = false AND l.status = 'new'
        WHEN 'marketplace' THEN l.is_marketplace = true AND l.status NOT IN ('fulfilled','cancelled','expired')
        WHEN 'fulfilled'   THEN l.status = 'fulfilled'
        WHEN 'zero'        THEN l.marketplace_reason = 'zero_vendors'
        ELSE TRUE
      END
    ORDER BY l.created_at DESC
    LIMIT _limit
  ) t;

  RETURN jsonb_build_object('ok', true, 'leads', v_rows);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_leads_dashboard(text, int) TO authenticated;
