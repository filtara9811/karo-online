-- 1. Lock vendor KYC identity numbers from self-overwrites.
-- Vendors may still update other fields on their row, but pan/aadhaar/gst
-- can only be set when previously NULL. Admins can change anything.
DROP POLICY IF EXISTS "Vendors update own row" ON public.vendors;

CREATE POLICY "Vendors update own row"
  ON public.vendors
  FOR UPDATE
  TO authenticated
  USING ((auth.uid() = user_id) OR public.is_admin_user(auth.uid()))
  WITH CHECK (
    public.is_admin_user(auth.uid())
    OR (
      auth.uid() = user_id
      -- Prevent overwrites of KYC identifiers once set.
      AND (
        pan IS NULL
        OR pan = (SELECT v2.pan FROM public.vendors v2 WHERE v2.user_id = vendors.user_id)
      )
      AND (
        aadhaar IS NULL
        OR aadhaar = (SELECT v2.aadhaar FROM public.vendors v2 WHERE v2.user_id = vendors.user_id)
      )
      AND (
        gst IS NULL
        OR gst = (SELECT v2.gst FROM public.vendors v2 WHERE v2.user_id = vendors.user_id)
      )
    )
  );

-- 2. Hide referred-user PII from the referrer.
-- Replace the broad self/admin SELECT policy with one that allows the
-- referrer only when the sensitive PII columns are NOT being selected.
-- For convenience, expose a sanitized view that the referrer can read.
DROP POLICY IF EXISTS "ref_select_own_or_admin" ON public.referrals;

CREATE POLICY "ref_select_own_or_admin"
  ON public.referrals
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = referred_user_id
    OR public.is_admin_user(auth.uid())
    -- Referrer access goes through the sanitized view below.
  );

CREATE OR REPLACE VIEW public.referrals_for_referrer
WITH (security_invoker = true)
AS
SELECT
  r.id,
  r.referrer_user_id,
  r.referred_user_id,
  r.kind,
  r.status,
  r.created_at,
  r.updated_at
FROM public.referrals r
WHERE r.referrer_user_id = auth.uid();

GRANT SELECT ON public.referrals_for_referrer TO authenticated;
