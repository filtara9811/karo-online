
-- QR Batches
CREATE TABLE public.qr_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_code text NOT NULL UNIQUE,
  size_preset text NOT NULL CHECK (size_preset IN ('a4','a5','sticker')),
  quantity integer NOT NULL CHECK (quantity > 0 AND quantity <= 1000),
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qr_batches TO authenticated;
GRANT ALL ON public.qr_batches TO service_role;
ALTER TABLE public.qr_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage qr_batches" ON public.qr_batches FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "field exec read assigned batches" ON public.qr_batches FOR SELECT TO authenticated
  USING (assigned_to_user_id = auth.uid() AND public.has_role(auth.uid(),'field_executive'));

-- QR Assets
CREATE TABLE public.qr_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.qr_batches(id) ON DELETE CASCADE,
  serial integer NOT NULL,
  code text NOT NULL UNIQUE,
  linked_vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  linked_at timestamptz,
  linked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'unlinked' CHECK (status IN ('unlinked','linked','disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (batch_id, serial)
);
CREATE INDEX qr_assets_vendor_idx ON public.qr_assets(linked_vendor_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qr_assets TO authenticated;
GRANT ALL ON public.qr_assets TO service_role;
ALTER TABLE public.qr_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage qr_assets" ON public.qr_assets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "field exec read assigned qr_assets" ON public.qr_assets FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'field_executive')
    AND EXISTS (SELECT 1 FROM public.qr_batches b WHERE b.id = qr_assets.batch_id AND b.assigned_to_user_id = auth.uid())
  );
CREATE POLICY "vendor read own linked qr_assets" ON public.qr_assets FOR SELECT TO authenticated
  USING (
    linked_vendor_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = qr_assets.linked_vendor_id AND v.user_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.tg_qr_assets_lock_link()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.linked_vendor_id IS NOT NULL AND NEW.linked_vendor_id IS DISTINCT FROM OLD.linked_vendor_id THEN
    RAISE EXCEPTION 'QR % already linked', OLD.code;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_qr_assets_lock_link BEFORE UPDATE ON public.qr_assets
  FOR EACH ROW EXECUTE FUNCTION public.tg_qr_assets_lock_link();

-- Customer Identities
CREATE TABLE public.customer_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile text NOT NULL UNIQUE,
  name text,
  verified_at timestamptz,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  device_fps text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_identities TO authenticated;
GRANT ALL ON public.customer_identities TO service_role;
ALTER TABLE public.customer_identities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read customer_identities" ON public.customer_identities FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- Vendor Customer Visits
CREATE TABLE public.vendor_customer_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  customer_identity_id uuid NOT NULL REFERENCES public.customer_identities(id) ON DELETE CASCADE,
  visit_count integer NOT NULL DEFAULT 1,
  first_visit_at timestamptz NOT NULL DEFAULT now(),
  last_visit_at timestamptz NOT NULL DEFAULT now(),
  source_kind text NOT NULL DEFAULT 'stand' CHECK (source_kind IN ('stand','card','poster','referral','direct')),
  source_qr_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vendor_id, customer_identity_id)
);
CREATE INDEX vcv_vendor_last_idx ON public.vendor_customer_visits(vendor_id, last_visit_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_customer_visits TO authenticated;
GRANT ALL ON public.vendor_customer_visits TO service_role;
ALTER TABLE public.vendor_customer_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vendor read own visits" ON public.vendor_customer_visits FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_customer_visits.vendor_id AND v.user_id = auth.uid()));
CREATE POLICY "admins read all visits" ON public.vendor_customer_visits FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- QR Scans
CREATE TABLE public.qr_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code text NOT NULL,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  customer_identity_id uuid REFERENCES public.customer_identities(id) ON DELETE SET NULL,
  device_fp text,
  ip text,
  user_agent text,
  scanned_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX qr_scans_vendor_idx ON public.qr_scans(vendor_id, scanned_at DESC);
GRANT SELECT, INSERT ON public.qr_scans TO authenticated;
GRANT ALL ON public.qr_scans TO service_role;
ALTER TABLE public.qr_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vendor read own qr_scans" ON public.qr_scans FOR SELECT TO authenticated
  USING (vendor_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = qr_scans.vendor_id AND v.user_id = auth.uid()));
CREATE POLICY "admins read all qr_scans" ON public.qr_scans FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER trg_qr_batches_touch BEFORE UPDATE ON public.qr_batches
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
CREATE TRIGGER trg_customer_identities_touch BEFORE UPDATE ON public.customer_identities
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
CREATE TRIGGER trg_vendor_customer_visits_touch BEFORE UPDATE ON public.vendor_customer_visits
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- RPCs
CREATE OR REPLACE FUNCTION public.admin_create_qr_batch(
  p_batch_code text, p_quantity integer, p_size_preset text,
  p_assigned_to uuid DEFAULT NULL, p_notes text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_batch_id uuid; i integer;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF p_quantity < 1 OR p_quantity > 1000 THEN RAISE EXCEPTION 'Quantity 1-1000'; END IF;
  INSERT INTO public.qr_batches(batch_code, size_preset, quantity, notes, created_by, assigned_to_user_id)
  VALUES (upper(trim(p_batch_code)), p_size_preset, p_quantity, p_notes, auth.uid(), p_assigned_to)
  RETURNING id INTO v_batch_id;
  FOR i IN 1..p_quantity LOOP
    INSERT INTO public.qr_assets(batch_id, serial, code)
    VALUES (v_batch_id, i, upper(trim(p_batch_code)) || '-' || lpad(i::text, 4, '0'));
  END LOOP;
  RETURN v_batch_id;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_create_qr_batch(text,integer,text,uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.link_qr_to_vendor(p_code text, p_vendor_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_asset public.qr_assets%ROWTYPE; v_vendor_user uuid;
  v_is_admin boolean; v_is_field boolean; v_assigned_to uuid;
BEGIN
  SELECT * INTO v_asset FROM public.qr_assets WHERE code = upper(trim(p_code));
  IF NOT FOUND THEN RAISE EXCEPTION 'QR not found'; END IF;
  IF v_asset.linked_vendor_id IS NOT NULL THEN RAISE EXCEPTION 'Already linked'; END IF;
  IF v_asset.status = 'disabled' THEN RAISE EXCEPTION 'QR disabled'; END IF;
  SELECT user_id INTO v_vendor_user FROM public.vendors WHERE id = p_vendor_id;
  IF v_vendor_user IS NULL THEN RAISE EXCEPTION 'Vendor not found'; END IF;
  v_is_admin := public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin');
  v_is_field := public.has_role(auth.uid(),'field_executive');
  SELECT assigned_to_user_id INTO v_assigned_to FROM public.qr_batches WHERE id = v_asset.batch_id;
  IF NOT (v_is_admin OR (v_is_field AND v_assigned_to = auth.uid()) OR v_vendor_user = auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.qr_assets
    SET linked_vendor_id = p_vendor_id, linked_at = now(), linked_by = auth.uid(), status = 'linked'
    WHERE id = v_asset.id;
  RETURN jsonb_build_object('ok', true, 'code', v_asset.code, 'vendor_id', p_vendor_id);
END $$;
GRANT EXECUTE ON FUNCTION public.link_qr_to_vendor(text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.resolve_qr(p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
DECLARE v_asset public.qr_assets%ROWTYPE; v_vendor public.vendors%ROWTYPE;
BEGIN
  SELECT * INTO v_asset FROM public.qr_assets WHERE code = upper(trim(p_code));
  IF NOT FOUND THEN RETURN jsonb_build_object('found', false); END IF;
  IF v_asset.linked_vendor_id IS NULL THEN
    RETURN jsonb_build_object('found', true, 'linked', false, 'code', v_asset.code);
  END IF;
  SELECT * INTO v_vendor FROM public.vendors WHERE id = v_asset.linked_vendor_id;
  RETURN jsonb_build_object(
    'found', true, 'linked', true, 'code', v_asset.code,
    'vendor', jsonb_build_object(
      'id', v_vendor.id, 'business_name', v_vendor.business_name,
      'owner_name', v_vendor.owner_name, 'whatsapp', v_vendor.whatsapp,
      'avatar_url', v_vendor.avatar_url, 'trade', v_vendor.trade,
      'is_online', v_vendor.is_online
    )
  );
END $$;
GRANT EXECUTE ON FUNCTION public.resolve_qr(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_customer_visit(
  p_code text, p_mobile text, p_name text, p_device_fp text, p_source_kind text DEFAULT 'stand'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_asset public.qr_assets%ROWTYPE; v_identity_id uuid;
  v_vendor_id uuid; v_visit public.vendor_customer_visits%ROWTYPE;
  v_mobile text := regexp_replace(p_mobile, '[^0-9]', '', 'g');
BEGIN
  IF length(v_mobile) < 10 THEN RAISE EXCEPTION 'Invalid mobile'; END IF;
  v_mobile := right(v_mobile, 10);
  SELECT * INTO v_asset FROM public.qr_assets WHERE code = upper(trim(p_code));
  IF NOT FOUND THEN RAISE EXCEPTION 'QR not found'; END IF;
  v_vendor_id := v_asset.linked_vendor_id;

  INSERT INTO public.customer_identities(mobile, name, verified_at, device_fps)
  VALUES (v_mobile, NULLIF(trim(p_name),''), now(),
    CASE WHEN p_device_fp IS NULL THEN '{}'::text[] ELSE ARRAY[p_device_fp] END)
  ON CONFLICT (mobile) DO UPDATE
    SET name = COALESCE(EXCLUDED.name, public.customer_identities.name),
        last_seen_at = now(),
        verified_at = COALESCE(public.customer_identities.verified_at, EXCLUDED.verified_at),
        device_fps = CASE
          WHEN p_device_fp IS NULL OR p_device_fp = ANY(public.customer_identities.device_fps)
            THEN public.customer_identities.device_fps
          ELSE public.customer_identities.device_fps || p_device_fp
        END
  RETURNING id INTO v_identity_id;

  IF v_vendor_id IS NOT NULL THEN
    INSERT INTO public.vendor_customer_visits(vendor_id, customer_identity_id, source_kind, source_qr_code)
    VALUES (v_vendor_id, v_identity_id, COALESCE(p_source_kind,'stand'), v_asset.code)
    ON CONFLICT (vendor_id, customer_identity_id) DO UPDATE
      SET visit_count = public.vendor_customer_visits.visit_count + 1,
          last_visit_at = now(),
          source_qr_code = EXCLUDED.source_qr_code
    RETURNING * INTO v_visit;
  END IF;

  INSERT INTO public.qr_scans(qr_code, vendor_id, customer_identity_id, device_fp)
  VALUES (v_asset.code, v_vendor_id, v_identity_id, p_device_fp);

  RETURN jsonb_build_object(
    'ok', true, 'identity_id', v_identity_id, 'vendor_id', v_vendor_id,
    'visit_count', COALESCE(v_visit.visit_count, 1),
    'is_returning', COALESCE(v_visit.visit_count, 1) > 1
  );
END $$;
GRANT EXECUTE ON FUNCTION public.record_customer_visit(text,text,text,text,text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.recognize_customer_by_fp(p_device_fp text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
DECLARE v public.customer_identities%ROWTYPE;
BEGIN
  IF p_device_fp IS NULL OR length(p_device_fp) < 4 THEN RETURN jsonb_build_object('found', false); END IF;
  SELECT * INTO v FROM public.customer_identities
    WHERE p_device_fp = ANY(device_fps) AND verified_at IS NOT NULL
    ORDER BY last_seen_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('found', false); END IF;
  RETURN jsonb_build_object('found', true, 'identity_id', v.id, 'mobile', v.mobile, 'name', v.name);
END $$;
GRANT EXECUTE ON FUNCTION public.recognize_customer_by_fp(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.vendor_get_visitors(
  p_sort text DEFAULT 'recent', p_source text DEFAULT NULL, p_limit integer DEFAULT 100
) RETURNS TABLE(
  identity_id uuid, name text, mobile text, visit_count integer,
  first_visit_at timestamptz, last_visit_at timestamptz, source_kind text, source_qr_code text
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
DECLARE v_vendor_id uuid;
BEGIN
  SELECT id INTO v_vendor_id FROM public.vendors WHERE user_id = auth.uid() LIMIT 1;
  IF v_vendor_id IS NULL THEN RAISE EXCEPTION 'Not a vendor'; END IF;
  RETURN QUERY
  SELECT ci.id, ci.name, ci.mobile, v.visit_count, v.first_visit_at, v.last_visit_at, v.source_kind, v.source_qr_code
  FROM public.vendor_customer_visits v
  JOIN public.customer_identities ci ON ci.id = v.customer_identity_id
  WHERE v.vendor_id = v_vendor_id
    AND (p_source IS NULL OR v.source_kind = p_source)
  ORDER BY
    CASE WHEN p_sort = 'loyal' THEN v.visit_count END DESC NULLS LAST,
    v.last_visit_at DESC
  LIMIT GREATEST(p_limit, 1);
END $$;
GRANT EXECUTE ON FUNCTION public.vendor_get_visitors(text,text,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.vendor_my_qr_codes()
RETURNS TABLE(code text, linked_at timestamptz, scan_count bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
DECLARE v_vendor_id uuid;
BEGIN
  SELECT id INTO v_vendor_id FROM public.vendors WHERE user_id = auth.uid() LIMIT 1;
  IF v_vendor_id IS NULL THEN RAISE EXCEPTION 'Not a vendor'; END IF;
  RETURN QUERY
  SELECT a.code, a.linked_at, COUNT(s.id) AS scan_count
  FROM public.qr_assets a
  LEFT JOIN public.qr_scans s ON s.qr_code = a.code
  WHERE a.linked_vendor_id = v_vendor_id
  GROUP BY a.code, a.linked_at
  ORDER BY a.linked_at DESC;
END $$;
GRANT EXECUTE ON FUNCTION public.vendor_my_qr_codes() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_qr_batches()
RETURNS TABLE(
  id uuid, batch_code text, size_preset text, quantity integer,
  linked_count bigint, unlinked_count bigint,
  assigned_to_user_id uuid, assigned_to_name text, notes text, created_at timestamptz
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY
  SELECT b.id, b.batch_code, b.size_preset, b.quantity,
    COUNT(*) FILTER (WHERE a.status='linked')::bigint,
    COUNT(*) FILTER (WHERE a.status='unlinked')::bigint,
    b.assigned_to_user_id,
    COALESCE(sp.full_name, '')::text,
    b.notes, b.created_at
  FROM public.qr_batches b
  LEFT JOIN public.qr_assets a ON a.batch_id = b.id
  LEFT JOIN public.staff_profiles sp ON sp.user_id = b.assigned_to_user_id
  GROUP BY b.id, sp.full_name
  ORDER BY b.created_at DESC;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_list_qr_batches() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_batch_codes(p_batch_id uuid)
RETURNS TABLE(code text, serial integer, status text, linked_vendor_id uuid, linked_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY
  SELECT a.code, a.serial, a.status, a.linked_vendor_id, a.linked_at
  FROM public.qr_assets a WHERE a.batch_id = p_batch_id ORDER BY a.serial ASC;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_list_batch_codes(uuid) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.vendor_customer_visits;
