CREATE OR REPLACE FUNCTION public.accept_lead(_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _vendor uuid := auth.uid();
  _lead public.leads%ROWTYPE;
  _coin_cost integer;
  _multiplier numeric;
  _final_coins integer;
  _coin_balance integer;
  _price_paise bigint;
  _wallet_balance bigint;
  _new_count integer;
  _notif_status text;
BEGIN
  IF _vendor IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'auth_required');
  END IF;

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
      SET status = 'accepted', responded_at = COALESCE(responded_at, now())
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

    RETURN jsonb_build_object('ok', true, 'lead', to_jsonb(_lead), 'already', true);
  END IF;

  IF _lead.accepted_count >= _lead.max_slots THEN
    UPDATE public.lead_notifications
      SET status = 'sold_out', responded_at = now()
      WHERE lead_id = _lead_id AND vendor_id = _vendor AND status = 'pending';
    RETURN jsonb_build_object('ok', false, 'reason', 'sold_out');
  END IF;

  SELECT COALESCE(c.lead_cost_coins, 0) INTO _coin_cost
    FROM public.categories c WHERE c.id = _lead.sub_category_id;
  _coin_cost := COALESCE(_coin_cost, 0);

  SELECT COALESCE(m.multiplier, 1) INTO _multiplier
    FROM public.lead_source_multipliers m WHERE m.source_key = _lead.source AND m.is_active = true;
  _multiplier := COALESCE(_multiplier, 1);

  _final_coins := CEIL(_coin_cost::numeric * _multiplier)::integer;

  IF _final_coins > 0 THEN
    INSERT INTO public.vendor_wallets (vendor_id)
    VALUES (_vendor)
    ON CONFLICT DO NOTHING;

    SELECT leadx_coins INTO _coin_balance
      FROM public.vendor_wallets WHERE vendor_id = _vendor FOR UPDATE;
    _coin_balance := COALESCE(_coin_balance, 0);

    IF _coin_balance < _final_coins THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'insufficient_coins', 'required', _final_coins, 'balance', _coin_balance);
    END IF;

    UPDATE public.vendor_wallets
      SET leadx_coins = leadx_coins - _final_coins,
          lifetime_coins_used = lifetime_coins_used + _final_coins,
          leads_used = leads_used + 1,
          updated_at = now()
      WHERE vendor_id = _vendor;

    INSERT INTO public.wallet_transactions
      (vendor_id, wallet_kind, txn_type, direction, coins, status, description, reference_id, coin_balance_after)
    VALUES
      (_vendor, 'coin', 'lead_purchase', 'debit', _final_coins, 'success',
       'Lead accepted: ' || _lead.sub_category_name, _lead_id::text, _coin_balance - _final_coins);
  END IF;

  _price_paise := COALESCE(_lead.lead_price_inr, 0)::bigint * 100;
  IF _price_paise > 0 AND _final_coins = 0 THEN
    INSERT INTO public.vendor_wallets (vendor_id, service_balance_paise)
    VALUES (_vendor, 0)
    ON CONFLICT DO NOTHING;

    SELECT service_balance_paise INTO _wallet_balance
      FROM public.vendor_wallets WHERE vendor_id = _vendor FOR UPDATE;
    _wallet_balance := COALESCE(_wallet_balance, 0);

    IF _wallet_balance < _price_paise THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'insufficient_balance', 'required_paise', _price_paise, 'balance_paise', _wallet_balance);
    END IF;

    UPDATE public.vendor_wallets
      SET service_balance_paise = service_balance_paise - _price_paise,
          lifetime_spent_paise = lifetime_spent_paise + _price_paise,
          leads_used = leads_used + 1,
          updated_at = now()
      WHERE vendor_id = _vendor;

    INSERT INTO public.wallet_transactions
      (vendor_id, wallet_kind, txn_type, direction, amount_paise, status, description, reference_id, balance_after_paise)
    VALUES
      (_vendor, 'service', 'lead_purchase', 'debit', _price_paise, 'success',
       'Lead accepted: ' || _lead.sub_category_name, _lead_id::text, _wallet_balance - _price_paise);
  END IF;

  _new_count := _lead.accepted_count + 1;
  UPDATE public.leads
    SET accepted_vendor_ids = array_append(accepted_vendor_ids, _vendor),
        accepted_count = _new_count,
        accepted_vendor_id = COALESCE(accepted_vendor_id, _vendor),
        accepted_at = COALESCE(accepted_at, now()),
        status = CASE WHEN _new_count >= max_slots THEN 'fulfilled' ELSE 'accepted' END,
        updated_at = now()
    WHERE id = _lead_id
    RETURNING * INTO _lead;

  UPDATE public.lead_notifications
    SET status = 'accepted', responded_at = now()
    WHERE lead_id = _lead_id AND vendor_id = _vendor;

  IF _new_count >= _lead.max_slots THEN
    UPDATE public.lead_notifications
      SET status = 'sold_out', responded_at = now()
      WHERE lead_id = _lead_id AND status = 'pending';
  END IF;

  RETURN jsonb_build_object('ok', true, 'lead', to_jsonb(_lead), 'slots_left', _lead.max_slots - _new_count, 'coins_deducted', _final_coins);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_lead_accepted_vendors(_lead_id uuid)
RETURNS TABLE(vendor_id uuid, business_name text, owner_name text, avatar_url text, whatsapp text, phone text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH lead_row AS (
    SELECT * FROM public.leads WHERE id = _lead_id
  ), accepted_vendor_ids AS (
    SELECT unnest(l.accepted_vendor_ids) AS vendor_user_id
    FROM lead_row l
    UNION
    SELECT n.vendor_id AS vendor_user_id
    FROM public.lead_notifications n
    WHERE n.lead_id = _lead_id AND n.status = 'accepted'
  )
  SELECT DISTINCT ON (v.user_id)
    v.user_id,
    v.business_name,
    v.owner_name,
    v.avatar_url,
    v.whatsapp,
    COALESCE(NULLIF(v.whatsapp, ''), (SELECT c.phone FROM public.customers c WHERE c.user_id = v.user_id LIMIT 1)) AS phone
  FROM lead_row l
  JOIN accepted_vendor_ids a ON true
  JOIN public.vendors v ON v.user_id = a.vendor_user_id
  WHERE COALESCE(v.is_blocked, false) = false
    AND (auth.uid() = l.customer_id OR auth.uid() = a.vendor_user_id OR is_admin_user(auth.uid()))
  ORDER BY v.user_id, v.updated_at DESC;
$$;