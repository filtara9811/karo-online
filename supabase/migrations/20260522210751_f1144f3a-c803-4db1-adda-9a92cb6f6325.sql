
-- 1) Track when a vendor starts working on an accepted lead
ALTER TABLE public.lead_notifications
  ADD COLUMN IF NOT EXISTS vendor_started_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_lead_notifications_vendor_started
  ON public.lead_notifications (vendor_id, vendor_started_at);

-- 2) Patch accept_lead to set vendor_started_at when vendor has auto_accept_leads ON
CREATE OR REPLACE FUNCTION public.accept_lead(_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _vendor uuid := auth.uid();
  _lead public.leads%ROWTYPE;
  _coin_cost integer;
  _multiplier numeric;
  _final_coins integer;
  _coin_balance integer;
  _new_count integer;
  _notif_status text;
  _auto boolean := false;
  _started timestamptz;
BEGIN
  IF _vendor IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'auth_required');
  END IF;

  SELECT COALESCE(auto_accept_leads, false) INTO _auto
    FROM public.vendors WHERE user_id = _vendor;
  _started := CASE WHEN _auto THEN now() ELSE NULL END;

  SELECT status INTO _notif_status
    FROM public.lead_notifications
    WHERE lead_id = _lead_id AND vendor_id = _vendor
    ORDER BY created_at DESC
    LIMIT 1;

  IF _notif_status IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_notified');
  END IF;

  SELECT * INTO _lead FROM public.leads WHERE id = _lead_id FOR UPDATE;
  IF _lead.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF _vendor = ANY(_lead.accepted_vendor_ids) OR _notif_status = 'accepted' THEN
    UPDATE public.lead_notifications
      SET status = 'accepted',
          responded_at = COALESCE(responded_at, now()),
          vendor_started_at = COALESCE(vendor_started_at, _started)
      WHERE lead_id = _lead_id AND vendor_id = _vendor;

    IF NOT (_vendor = ANY(_lead.accepted_vendor_ids)) THEN
      UPDATE public.leads
        SET accepted_vendor_ids = array_append(accepted_vendor_ids, _vendor),
            accepted_count = accepted_count + 1,
            accepted_vendor_id = COALESCE(accepted_vendor_id, _vendor),
            accepted_at = COALESCE(accepted_at, now()),
            status = CASE WHEN accepted_count + 1 >= max_slots THEN 'fulfilled' ELSE 'accepted' END,
            updated_at = now()
        WHERE id = _lead_id
        RETURNING * INTO _lead;
    END IF;

    RETURN jsonb_build_object('ok', true, 'lead', to_jsonb(_lead), 'already', true, 'auto_started', _auto);
  END IF;

  IF _lead.accepted_count >= _lead.max_slots THEN
    UPDATE public.lead_notifications
      SET status = 'sold_out', responded_at = now()
      WHERE lead_id = _lead_id AND vendor_id = _vendor AND status = 'pending';
    RETURN jsonb_build_object('ok', false, 'reason', 'sold_out');
  END IF;

  -- Coin cost calculation (unchanged from previous logic)
  SELECT COALESCE(c.lead_cost_coins, 0) INTO _coin_cost
    FROM public.categories c WHERE c.id = _lead.sub_category_id;
  _coin_cost := COALESCE(_coin_cost, 0);

  SELECT COALESCE(m.multiplier, 1) INTO _multiplier
    FROM public.lead_source_multipliers m
    WHERE m.source_key = _lead.source AND m.is_active = true;
  _multiplier := COALESCE(_multiplier, 1);

  _final_coins := GREATEST(0, CEIL(_coin_cost::numeric * _multiplier)::integer);

  IF _final_coins > 0 THEN
    SELECT COALESCE(SUM(coins),0) INTO _coin_balance
      FROM public.coin_transfers WHERE receiver_id = _vendor;
    SELECT _coin_balance - COALESCE(SUM(coins),0) INTO _coin_balance
      FROM public.coin_transfers WHERE sender_id = _vendor;
    IF _coin_balance < _final_coins THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'insufficient_coins');
    END IF;
    INSERT INTO public.coin_transfers(sender_id, receiver_id, coins, note)
      VALUES (_vendor, '00000000-0000-0000-0000-000000000000'::uuid, _final_coins, 'lead_accept:' || _lead_id::text);
  END IF;

  UPDATE public.leads
    SET accepted_vendor_ids = array_append(accepted_vendor_ids, _vendor),
        accepted_count = accepted_count + 1,
        accepted_vendor_id = COALESCE(accepted_vendor_id, _vendor),
        accepted_at = COALESCE(accepted_at, now()),
        status = CASE WHEN accepted_count + 1 >= max_slots THEN 'fulfilled' ELSE 'accepted' END,
        updated_at = now()
    WHERE id = _lead_id
    RETURNING * INTO _lead;

  UPDATE public.lead_notifications
    SET status = 'accepted',
        responded_at = now(),
        vendor_started_at = COALESCE(vendor_started_at, _started)
    WHERE lead_id = _lead_id AND vendor_id = _vendor;

  RETURN jsonb_build_object('ok', true, 'lead', to_jsonb(_lead), 'auto_started', _auto);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'reason', 'error', 'detail', SQLERRM);
END;
$$;

-- 3) Vendor moves an accepted lead onto their working dashboard
CREATE OR REPLACE FUNCTION public.start_lead_work(_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _vendor uuid := auth.uid();
  _updated integer;
BEGIN
  IF _vendor IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'auth_required');
  END IF;

  UPDATE public.lead_notifications
    SET vendor_started_at = COALESCE(vendor_started_at, now())
    WHERE lead_id = _lead_id
      AND vendor_id = _vendor
      AND status = 'accepted';
  GET DIAGNOSTICS _updated = ROW_COUNT;

  IF _updated = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_accepted');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_lead_work(uuid) TO authenticated;

-- 4) Fast per-lead unread counter for chat badges
CREATE OR REPLACE FUNCTION public.count_unread_lead_messages(_lead_ids uuid[])
RETURNS TABLE(lead_id uuid, unread_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lm.lead_id, COUNT(*)::bigint
    FROM public.lead_messages lm
    WHERE lm.lead_id = ANY(_lead_ids)
      AND lm.recipient_id = auth.uid()
      AND lm.read_at IS NULL
    GROUP BY lm.lead_id;
$$;

GRANT EXECUTE ON FUNCTION public.count_unread_lead_messages(uuid[]) TO authenticated;
