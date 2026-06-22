
-- 1) Pin search_path on the two flagged functions
ALTER FUNCTION public.tg_touch_updated_at() SET search_path = public;
ALTER FUNCTION public._lead_whatsapp_webhook_url() SET search_path = public;

-- 2) Tighten referral_link_visits INSERT policy
-- Helper: resolve referral code -> owner (SECURITY DEFINER so anon can validate)
CREATE OR REPLACE FUNCTION public.referral_code_owner(_code text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM public.referral_codes WHERE code = _code LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.referral_code_owner(text) FROM public;
GRANT EXECUTE ON FUNCTION public.referral_code_owner(text) TO anon, authenticated;

DROP POLICY IF EXISTS "anon may insert via RPC" ON public.referral_link_visits;
CREATE POLICY "visits_insert_validated"
  ON public.referral_link_visits
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    code IS NOT NULL
    AND referrer_user_id IS NOT NULL
    AND referrer_user_id = public.referral_code_owner(code)
  );

-- 3) Realtime publication column-filter drift guard
-- Documents intended column list and raises if sensitive columns leak into the publication.
CREATE OR REPLACE FUNCTION public.assert_realtime_publication_columns()
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _leaked text;
BEGIN
  SELECT string_agg(t.tablename || '.' || c, ', ')
    INTO _leaked
    FROM pg_publication_tables t
    CROSS JOIN LATERAL unnest(t.attnames) AS c
   WHERE t.pubname = 'supabase_realtime'
     AND (
       (t.tablename = 'leads'   AND c IN ('customer_name','customer_phone','address','lat','lng','customer_email','customer_notes'))
       OR (t.tablename = 'vendors' AND c IN ('aadhaar','pan','gst','whatsapp','manager_email','email','admin_notes','tags','assigned_to','phone'))
       OR (t.tablename = 'customers')
     );
  IF _leaked IS NOT NULL THEN
    RAISE EXCEPTION 'Realtime publication column drift detected: %', _leaked;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_realtime_publication_columns() FROM public;
GRANT EXECUTE ON FUNCTION public.assert_realtime_publication_columns() TO authenticated, service_role;

COMMENT ON FUNCTION public.assert_realtime_publication_columns() IS
  'Drift guard for supabase_realtime publication. Sensitive columns on leads/vendors MUST be excluded; customers table MUST NOT be published. Call from CI / scheduled job to detect schema drift.';

-- Run once now to assert current state is clean
SELECT public.assert_realtime_publication_columns();

-- 4) Document wallet_transactions invariant (reviewed: all SECURITY DEFINER writers re-validate auth.uid())
COMMENT ON TABLE public.wallet_transactions IS
  'INSERTs restricted to admins via RLS. SECURITY DEFINER writers (admin_adjust_wallet, transfer_coins, admin_approve_referral_reward) all re-validate auth.uid() — admin checks via is_admin_user() or use auth.uid() as the credited/debited vendor_id. Do not add new writer functions without re-validating the caller.';
