
-- 1) Add rejection_reason to lead_notifications
ALTER TABLE public.lead_notifications
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- 2) Auto-generate Webhook Verify Token for Meta WhatsApp Cloud (only if empty)
UPDATE public.whatsapp_providers
SET webhook_verify_token = 'karoonline_wa_verify_' || encode(gen_random_bytes(24), 'hex')
WHERE provider IN ('meta_cloud', 'fast2sms_meta')
  AND (webhook_verify_token IS NULL OR webhook_verify_token = '');

-- 3) accept_lead_for_vendor — service-role variant of accept_lead, callable from WhatsApp webhook
CREATE OR REPLACE FUNCTION public.accept_lead_for_vendor(_lead_id uuid, _vendor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _lead public.leads%ROWTYPE;
  _coin_cost integer;
  _multiplier numeric;
  _final_coins integer;
  _coin_balance integer;
  _notif_status text;
  _auto boolean := false;
  _started timestamptz;
BEGIN
  IF _vendor_id IS NULL OR _lead_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'missing_args');
  END IF;

  SELECT COALESCE(auto_accept_leads, false) INTO _auto
    FROM public.vendors WHERE user_id = _vendor_id;
  _started := CASE WHEN _auto THEN now() ELSE NULL END;

  SELECT status INTO _notif_status
    FROM public.lead_notifications
    WHERE lead_id = _lead_id AND vendor_id = _vendor_id
    ORDER BY created_at DESC LIMIT 1;

  IF _notif_status IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_notified');
  END IF;

  SELECT * INTO _lead FROM public.leads WHERE id = _lead_id FOR UPDATE;
  IF _lead.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  -- Already accepted (idempotent)
  IF _vendor_id = ANY(_lead.accepted_vendor_ids) OR _notif_status = 'accepted' THEN
    UPDATE public.lead_notifications
      SET status = 'accepted',
          responded_at = COALESCE(responded_at, now()),
          vendor_started_at = COALESCE(vendor_started_at, _started)
      WHERE lead_id = _lead_id AND vendor_id = _vendor_id;

    IF NOT (_vendor_id = ANY(_lead.accepted_vendor_ids)) THEN
      UPDATE public.leads
        SET accepted_vendor_ids = array_append(accepted_vendor_ids, _vendor_id),
            accepted_count = accepted_count + 1,
            accepted_vendor_id = COALESCE(accepted_vendor_id, _vendor_id),
            accepted_at = COALESCE(accepted_at, now()),
            status = CASE WHEN accepted_count + 1 >= max_slots THEN 'fulfilled' ELSE 'accepted' END,
            updated_at = now()
        WHERE id = _lead_id
        RETURNING * INTO _lead;
    END IF;

    RETURN jsonb_build_object('ok', true, 'lead_id', _lead.id, 'already', true);
  END IF;

  IF _lead.accepted_count >= _lead.max_slots THEN
    UPDATE public.lead_notifications
      SET status = 'sold_out', responded_at = now()
      WHERE lead_id = _lead_id AND vendor_id = _vendor_id AND status = 'pending';
    RETURN jsonb_build_object('ok', false, 'reason', 'sold_out');
  END IF;

  -- Coin cost
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
      FROM public.coin_transfers WHERE receiver_id = _vendor_id;
    SELECT _coin_balance - COALESCE(SUM(coins),0) INTO _coin_balance
      FROM public.coin_transfers WHERE sender_id = _vendor_id;
    IF _coin_balance < _final_coins THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'insufficient_coins');
    END IF;
    INSERT INTO public.coin_transfers(sender_id, receiver_id, coins, note)
      VALUES (_vendor_id, '00000000-0000-0000-0000-000000000000'::uuid, _final_coins, 'lead_accept_wa:' || _lead_id::text);
  END IF;

  UPDATE public.leads
    SET accepted_vendor_ids = array_append(accepted_vendor_ids, _vendor_id),
        accepted_count = accepted_count + 1,
        accepted_vendor_id = COALESCE(accepted_vendor_id, _vendor_id),
        accepted_at = COALESCE(accepted_at, now()),
        status = CASE WHEN accepted_count + 1 >= max_slots THEN 'fulfilled' ELSE 'accepted' END,
        updated_at = now()
    WHERE id = _lead_id
    RETURNING * INTO _lead;

  UPDATE public.lead_notifications
    SET status = 'accepted',
        responded_at = now(),
        vendor_started_at = COALESCE(vendor_started_at, _started)
    WHERE lead_id = _lead_id AND vendor_id = _vendor_id;

  RETURN jsonb_build_object('ok', true, 'lead_id', _lead.id, 'coins_charged', _final_coins);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'reason', 'error', 'detail', SQLERRM);
END;
$$;

-- 4) reject_lead_for_vendor — service-role variant for WhatsApp/Voice rejection
CREATE OR REPLACE FUNCTION public.reject_lead_for_vendor(_lead_id uuid, _vendor_id uuid, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _updated integer;
BEGIN
  IF _vendor_id IS NULL OR _lead_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'missing_args');
  END IF;

  UPDATE public.lead_notifications
    SET status = 'rejected',
        responded_at = now(),
        rejection_reason = NULLIF(_reason, '')
    WHERE lead_id = _lead_id
      AND vendor_id = _vendor_id
      AND status = 'pending';
  GET DIAGNOSTICS _updated = ROW_COUNT;

  IF _updated = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_pending');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 5) Lock down — only service_role may invoke these (called from server route handlers)
REVOKE ALL ON FUNCTION public.accept_lead_for_vendor(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_lead_for_vendor(uuid, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_lead_for_vendor(uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.reject_lead_for_vendor(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_lead_for_vendor(uuid, uuid, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reject_lead_for_vendor(uuid, uuid, text) TO service_role;
