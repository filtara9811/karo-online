-- Auto-broadcast a lead to nearby vendors the moment it lands in the leads table.
-- This is critical for the offline-first flow: when a queued lead.create is
-- synced after the device reconnects, the trigger fires server-side and
-- vendors are notified immediately — no client-side RPC required.

CREATE OR REPLACE FUNCTION public.tg_leads_autobroadcast()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fire for newly created leads in 'new' status.
  IF NEW.status IS DISTINCT FROM 'new' THEN
    RETURN NEW;
  END IF;
  BEGIN
    PERFORM public.broadcast_next_lead_batch(NEW.id, 5, 0);
  EXCEPTION WHEN OTHERS THEN
    -- Never block the insert if broadcast fails (e.g. no vendors in range).
    RAISE WARNING 'autobroadcast failed for lead %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leads_autobroadcast ON public.leads;
CREATE TRIGGER trg_leads_autobroadcast
AFTER INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.tg_leads_autobroadcast();