
-- 1) auto_accept_at on lead_notifications
ALTER TABLE public.lead_notifications
  ADD COLUMN IF NOT EXISTS auto_accept_at timestamptz NOT NULL DEFAULT (now() + interval '15 seconds');

CREATE INDEX IF NOT EXISTS idx_lnotif_auto_accept
  ON public.lead_notifications (auto_accept_at)
  WHERE status = 'pending';

-- 2) mask_phone helper
CREATE OR REPLACE FUNCTION public.mask_phone(_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _phone IS NULL OR length(regexp_replace(_phone, '\D', '', 'g')) < 4 THEN NULL
    ELSE '•••• ' || right(regexp_replace(_phone, '\D', '', 'g'), 4)
  END
$$;

-- 3) Auto-accept expired pending notifications
CREATE OR REPLACE FUNCTION public.auto_accept_expired_lead_notifications()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _n record;
  _lead public.leads%ROWTYPE;
  _coin_cost int;
  _multiplier numeric;
  _final_coins int;
  _coin_balance int;
  _new_count int;
  _accepted int := 0;
  _expired int := 0;
BEGIN
  FOR _n IN
    SELECT n.id, n.lead_id, n.vendor_id
    FROM public.lead_notifications n
    WHERE n.status = 'pending'
      AND n.auto_accept_at <= now()
    ORDER BY n.auto_accept_at ASC
    LIMIT 200
  LOOP
    SELECT * INTO _lead FROM public.leads WHERE id = _n.lead_id FOR UPDATE;
    IF _lead.id IS NULL OR _lead.accepted_count >= _lead.max_slots OR _lead.status NOT IN ('new','searching_complete','accepted') THEN
      UPDATE public.lead_notifications SET status='expired', responded_at=now()
        WHERE id = _n.id AND status='pending';
      _expired := _expired + 1;
      CONTINUE;
    END IF;
    IF _n.vendor_id = ANY(_lead.accepted_vendor_ids) THEN
      UPDATE public.lead_notifications SET status='accepted', responded_at=now()
        WHERE id = _n.id AND status='pending';
      CONTINUE;
    END IF;

    -- Determine coin cost
    SELECT COALESCE(c.lead_cost_coins, 0) INTO _coin_cost FROM public.categories c WHERE c.id = _lead.sub_category_id;
    _coin_cost := COALESCE(_coin_cost, 0);
    SELECT COALESCE(m.multiplier, 1) INTO _multiplier FROM public.lead_source_multipliers m WHERE m.source_key = _lead.source AND m.is_active = true;
    _multiplier := COALESCE(_multiplier, 1);
    _final_coins := CEIL(_coin_cost::numeric * _multiplier)::int;

    IF _final_coins > 0 THEN
      INSERT INTO public.vendor_wallets (vendor_id) VALUES (_n.vendor_id) ON CONFLICT DO NOTHING;
      SELECT leadx_coins INTO _coin_balance FROM public.vendor_wallets WHERE vendor_id = _n.vendor_id FOR UPDATE;
      _coin_balance := COALESCE(_coin_balance, 0);
      IF _coin_balance < _final_coins THEN
        UPDATE public.lead_notifications SET status='expired', responded_at=now()
          WHERE id = _n.id AND status='pending';
        _expired := _expired + 1;
        CONTINUE;
      END IF;
      UPDATE public.vendor_wallets
        SET leadx_coins = leadx_coins - _final_coins,
            lifetime_coins_used = lifetime_coins_used + _final_coins,
            leads_used = leads_used + 1,
            updated_at = now()
        WHERE vendor_id = _n.vendor_id;
      INSERT INTO public.wallet_transactions
        (vendor_id, wallet_kind, txn_type, direction, coins, status, description, reference_id, coin_balance_after)
      VALUES (_n.vendor_id, 'coin', 'lead_purchase', 'debit', _final_coins, 'success',
              'Auto-accept: ' || _lead.sub_category_name, _lead.id::text, _coin_balance - _final_coins);
    END IF;

    _new_count := _lead.accepted_count + 1;
    UPDATE public.leads
      SET accepted_vendor_ids = array_append(accepted_vendor_ids, _n.vendor_id),
          accepted_count = _new_count,
          accepted_vendor_id = COALESCE(accepted_vendor_id, _n.vendor_id),
          accepted_at = COALESCE(accepted_at, now()),
          status = CASE WHEN _new_count >= max_slots THEN 'fulfilled' ELSE 'accepted' END,
          updated_at = now()
      WHERE id = _lead.id;

    UPDATE public.lead_notifications SET status='accepted', responded_at=now()
      WHERE id = _n.id AND status='pending';
    _accepted := _accepted + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'accepted', _accepted, 'expired', _expired);
END;
$$;

-- 4) vendor_status_updates
CREATE TABLE IF NOT EXISTS public.vendor_status_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL,
  status_key text NOT NULL,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vsu_lead ON public.vendor_status_updates(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vsu_vendor ON public.vendor_status_updates(vendor_id, created_at DESC);

ALTER TABLE public.vendor_status_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vendor inserts own status update" ON public.vendor_status_updates;
CREATE POLICY "Vendor inserts own status update"
ON public.vendor_status_updates
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = vendor_id
  AND EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_id
      AND auth.uid() = ANY(l.accepted_vendor_ids)
  )
);

DROP POLICY IF EXISTS "Involved parties read status updates" ON public.vendor_status_updates;
CREATE POLICY "Involved parties read status updates"
ON public.vendor_status_updates
FOR SELECT
TO authenticated
USING (
  auth.uid() = vendor_id
  OR public.is_admin_user(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_id AND l.customer_id = auth.uid()
  )
);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.vendor_status_updates;
