
-- 1. Per-category lead config (price + slot override)
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS lead_price_inr numeric,
  ADD COLUMN IF NOT EXISTS max_vendors_per_lead integer;

-- 2. Global app settings (lead defaults, vendor APK url, image library)
INSERT INTO public.app_settings (key, value)
VALUES
  ('lead_defaults', '{"max_vendors_per_lead": 5, "default_price_inr": 20}'::jsonb),
  ('vendor_app', '{"apk_url": "", "play_store_url": ""}'::jsonb),
  ('media_library', '{"items": []}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 3. Lead extensions: slot tracking + cost
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS max_slots integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS accepted_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lead_price_inr numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS accepted_vendor_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

-- 4. Replace accept_lead with multi-slot, paid version
CREATE OR REPLACE FUNCTION public.accept_lead(_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _vendor uuid := auth.uid();
  _lead public.leads%ROWTYPE;
  _price_paise bigint;
  _wallet_balance bigint;
  _new_count integer;
BEGIN
  IF _vendor IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'auth_required');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.lead_notifications
    WHERE lead_id = _lead_id AND vendor_id = _vendor
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_notified');
  END IF;

  -- Lock the lead row
  SELECT * INTO _lead FROM public.leads WHERE id = _lead_id FOR UPDATE;

  IF _lead.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  -- Already accepted by this vendor?
  IF _vendor = ANY(_lead.accepted_vendor_ids) THEN
    RETURN jsonb_build_object('ok', true, 'lead', to_jsonb(_lead), 'already', true);
  END IF;

  -- Slots full?
  IF _lead.accepted_count >= _lead.max_slots THEN
    UPDATE public.lead_notifications
      SET status = 'sold_out', responded_at = now()
      WHERE lead_id = _lead_id AND vendor_id = _vendor AND status = 'pending';
    RETURN jsonb_build_object('ok', false, 'reason', 'sold_out');
  END IF;

  _price_paise := COALESCE(_lead.lead_price_inr, 0)::bigint * 100;

  -- Wallet check + deduct
  IF _price_paise > 0 THEN
    SELECT service_balance_paise INTO _wallet_balance
      FROM public.vendor_wallets WHERE vendor_id = _vendor FOR UPDATE;

    IF _wallet_balance IS NULL THEN
      INSERT INTO public.vendor_wallets (vendor_id, service_balance_paise)
        VALUES (_vendor, 0)
        ON CONFLICT DO NOTHING;
      _wallet_balance := 0;
    END IF;

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

  -- Append vendor & increment slot
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

  -- Mark this vendor's notification accepted
  UPDATE public.lead_notifications
    SET status = 'accepted', responded_at = now()
    WHERE lead_id = _lead_id AND vendor_id = _vendor;

  -- If full, expire all other pending notifications
  IF _new_count >= _lead.max_slots THEN
    UPDATE public.lead_notifications
      SET status = 'sold_out', responded_at = now()
      WHERE lead_id = _lead_id AND status = 'pending';
  END IF;

  RETURN jsonb_build_object('ok', true, 'lead', to_jsonb(_lead), 'slots_left', _lead.max_slots - _new_count);
END;
$$;

-- 5. Helper: get accepted vendors for a lead (customer dashboard)
CREATE OR REPLACE FUNCTION public.get_lead_accepted_vendors(_lead_id uuid)
RETURNS TABLE (
  vendor_id uuid,
  business_name text,
  owner_name text,
  avatar_url text,
  whatsapp text,
  phone text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.user_id, v.business_name, v.owner_name, v.avatar_url, v.whatsapp,
         (SELECT c.phone FROM public.customers c WHERE c.user_id = v.user_id LIMIT 1)
  FROM public.leads l
  JOIN public.vendors v ON v.user_id = ANY(l.accepted_vendor_ids)
  WHERE l.id = _lead_id
    AND (auth.uid() = l.customer_id OR auth.uid() = ANY(l.accepted_vendor_ids) OR is_admin_user(auth.uid()));
$$;
