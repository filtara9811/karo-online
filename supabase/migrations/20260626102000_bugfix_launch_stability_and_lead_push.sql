-- Bug-fix release: server-side lead push dispatch + correct geo-ring schedule.
-- Root cause fixed here:
-- 1) Scheduled batches were passing 5/8 as "ring_index", so they searched >10km and returned ring_empty.
-- 2) FCM push was only triggered from the customer browser; if the app closed or FCM service account failed, vendors heard no bell.

CREATE OR REPLACE FUNCTION public._lead_push_webhook_url()
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT 'https://karoonline.in/api/public/push/send-lead'
$$;

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

  -- Ring 0 — immediate, 0–1 km.
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

    BEGIN
      PERFORM net.http_post(
        url := public._lead_push_webhook_url(),
        headers := '{"Content-Type":"application/json"}'::jsonb,
        body := jsonb_build_object('lead_id', NEW.id, 'vendor_ids', v_vendor_ids, 'batch_no', 1)
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'push dispatch failed (batch1) for lead %: %', NEW.id, SQLERRM;
    END;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'autobroadcast b1 failed for lead %: %', NEW.id, SQLERRM;
  END;

  -- If first ring has zero vendors, list in marketplace immediately.
  IF v_count = 0 AND NOT EXISTS (SELECT 1 FROM public.lead_notifications WHERE lead_id = NEW.id) THEN
    UPDATE public.leads
      SET is_marketplace = true,
          marketplace_reason = 'zero_vendors',
          marketplace_at = now()
      WHERE id = NEW.id;
  END IF;

  -- batch_offset is used as ring_index: 1=1–2km, 2=2–5km, 3=5–10km.
  INSERT INTO public.lead_broadcast_schedule (lead_id, batch_no, batch_size, batch_offset, fire_at)
  VALUES (NEW.id, 2, 5, 1, now() + interval '30 seconds');

  INSERT INTO public.lead_broadcast_schedule (lead_id, batch_no, batch_size, batch_offset, fire_at)
  VALUES (NEW.id, 3, 5, 2, now() + interval '60 seconds');

  INSERT INTO public.lead_broadcast_schedule (lead_id, batch_no, batch_size, batch_offset, fire_at)
  VALUES (NEW.id, 4, 5, 3, now() + interval '90 seconds');

  INSERT INTO public.lead_broadcast_schedule (lead_id, batch_no, batch_size, batch_offset, fire_at)
  VALUES (NEW.id, 99, 0, 0, now() + interval '120 seconds');

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_lead_broadcast_schedule()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_result jsonb;
  v_vendor_ids jsonb;
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

    v_vendor_ids := COALESCE(v_result->'vendor_ids', '[]'::jsonb);

    UPDATE public.lead_broadcast_schedule
      SET processed_at = now(), result = v_result
      WHERE id = r.id;

    BEGIN
      PERFORM net.http_post(
        url := public._lead_whatsapp_webhook_url(),
        headers := '{"Content-Type":"application/json"}'::jsonb,
        body := jsonb_build_object('lead_id', r.lead_id, 'vendor_ids', v_vendor_ids, 'batch_no', r.batch_no)
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'whatsapp dispatch failed (batch%) for lead %: %', r.batch_no, r.lead_id, SQLERRM;
    END;

    BEGIN
      PERFORM net.http_post(
        url := public._lead_push_webhook_url(),
        headers := '{"Content-Type":"application/json"}'::jsonb,
        body := jsonb_build_object('lead_id', r.lead_id, 'vendor_ids', v_vendor_ids, 'batch_no', r.batch_no)
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'push dispatch failed (batch%) for lead %: %', r.batch_no, r.lead_id, SQLERRM;
    END;

    v_done := v_done + 1;
  END LOOP;

  RETURN v_done;
END;
$$;

GRANT EXECUTE ON FUNCTION public._lead_push_webhook_url() TO service_role;
GRANT EXECUTE ON FUNCTION public.process_lead_broadcast_schedule() TO service_role;

-- Repair any still-pending scheduled rows created with the old 5/8 "offset" values.
UPDATE public.lead_broadcast_schedule
SET batch_offset = CASE WHEN batch_offset = 5 THEN 1 WHEN batch_offset = 8 THEN 2 ELSE batch_offset END
WHERE processed_at IS NULL AND batch_offset IN (5, 8);
