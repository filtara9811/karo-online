
-- 1. Schedule table
CREATE TABLE IF NOT EXISTS public.lead_broadcast_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  batch_no smallint NOT NULL,
  batch_size smallint NOT NULL,
  batch_offset smallint NOT NULL DEFAULT 0,
  fire_at timestamptz NOT NULL,
  processed_at timestamptz,
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.lead_broadcast_schedule TO authenticated;
GRANT ALL ON public.lead_broadcast_schedule TO service_role;

ALTER TABLE public.lead_broadcast_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages schedule"
  ON public.lead_broadcast_schedule FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read own lead schedule"
  ON public.lead_broadcast_schedule FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_broadcast_schedule.lead_id AND l.customer_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_lbs_due
  ON public.lead_broadcast_schedule (fire_at)
  WHERE processed_at IS NULL;

-- 2. Stable WhatsApp webhook URL (preview-stable). The endpoint silently no-ops
--    when the GatewayAPI connector secret is not configured, so it is safe to
--    call before the connector is linked.
CREATE OR REPLACE FUNCTION public._lead_whatsapp_webhook_url()
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT 'https://leadsx24.lovable.app/api/public/hooks/lead-whatsapp'
$$;

-- 3. Updated auto-broadcast trigger: enqueue 3 waterfall batches.
CREATE OR REPLACE FUNCTION public.tg_leads_autobroadcast()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
  v_vendor_ids jsonb;
BEGIN
  IF NEW.status IS DISTINCT FROM 'new' THEN
    RETURN NEW;
  END IF;

  -- Batch 1 — immediate, 5 vendors
  BEGIN
    v_result := public.broadcast_next_lead_batch(NEW.id, 5, 0);
    v_vendor_ids := COALESCE(v_result->'vendor_ids', '[]'::jsonb);
    -- Log batch 1 as already processed
    INSERT INTO public.lead_broadcast_schedule (lead_id, batch_no, batch_size, batch_offset, fire_at, processed_at, result)
    VALUES (NEW.id, 1, 5, 0, now(), now(), v_result);

    -- Fire WhatsApp fan-out for batch 1 (best-effort)
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

  -- Batch 2 — +30s, 3 vendors
  INSERT INTO public.lead_broadcast_schedule (lead_id, batch_no, batch_size, batch_offset, fire_at)
  VALUES (NEW.id, 2, 3, 5, now() + interval '30 seconds');

  -- Batch 3 — +60s, 2 vendors
  INSERT INTO public.lead_broadcast_schedule (lead_id, batch_no, batch_size, batch_offset, fire_at)
  VALUES (NEW.id, 3, 2, 8, now() + interval '60 seconds');

  RETURN NEW;
END;
$function$;

-- 4. Processor for due batches.
CREATE OR REPLACE FUNCTION public.process_lead_broadcast_schedule()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    -- Skip if lead is already fulfilled / cancelled
    SELECT * INTO v_lead FROM public.leads WHERE id = r.lead_id;
    IF NOT FOUND OR v_lead.status IN ('fulfilled', 'cancelled', 'expired') THEN
      UPDATE public.lead_broadcast_schedule
        SET processed_at = now(), result = jsonb_build_object('skipped', true, 'reason', COALESCE(v_lead.status, 'not_found'))
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

GRANT EXECUTE ON FUNCTION public.process_lead_broadcast_schedule() TO service_role;

-- 5. pg_cron — run processor every 15 seconds.
DO $$
BEGIN
  PERFORM cron.unschedule('process-lead-broadcast-schedule');
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

SELECT cron.schedule(
  'process-lead-broadcast-schedule',
  '15 seconds',
  $$SELECT public.process_lead_broadcast_schedule();$$
);
