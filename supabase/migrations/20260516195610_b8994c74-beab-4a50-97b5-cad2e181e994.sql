
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname='auto-accept-leads') THEN
    PERFORM cron.unschedule('auto-accept-leads');
  END IF;
  PERFORM cron.schedule(
    'auto-accept-leads',
    '* * * * *',
    $cron$ SELECT public.auto_accept_expired_lead_notifications(); $cron$
  );
END $$;
