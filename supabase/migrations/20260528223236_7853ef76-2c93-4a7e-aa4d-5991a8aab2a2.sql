
-- Phase 5: Wholesaler/Retailer + Remote services + Feedback

ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS vendor_type text NOT NULL DEFAULT 'retailer';
ALTER TABLE public.vendors ADD CONSTRAINT vendors_vendor_type_chk CHECK (vendor_type IN ('wholesaler','retailer','manufacturer'));
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS is_remote_capable boolean NOT NULL DEFAULT false;

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS vendor_types text[] NOT NULL DEFAULT ARRAY['wholesaler','retailer','manufacturer']::text[];
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS is_remote boolean NOT NULL DEFAULT false;

-- Updated broadcast: respect vendor_types filter; if is_remote → ignore distance/rings entirely
CREATE OR REPLACE FUNCTION public.broadcast_next_lead_batch(_lead_id uuid, _batch_size integer DEFAULT 3, _ring_index integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lead          public.leads%ROWTYPE;
  v_remaining     integer;
  v_user_radius   integer;
  v_picked        uuid[];
  v_stale_after   interval := interval '10 minutes';
  v_ring_min      numeric;
  v_ring_max      numeric;
  v_hard_max      numeric;
BEGIN
  SELECT * INTO v_lead FROM public.leads WHERE id = _lead_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('done', true, 'reason', 'lead_not_found', 'vendor_ids', '[]'::jsonb);
  END IF;

  v_remaining := GREATEST(0, COALESCE(v_lead.max_slots, 5) - COALESCE(v_lead.accepted_count, 0));
  IF v_remaining <= 0 THEN
    RETURN jsonb_build_object('done', true, 'reason', 'cap_reached', 'vendor_ids', '[]'::jsonb);
  END IF;

  -- REMOTE MODE: skip distance entirely, match any remote-capable vendor of allowed types
  IF v_lead.is_remote THEN
    WITH eligible AS (
      SELECT v.id AS vendor_id, v.is_premium
      FROM public.vendors v
      WHERE v.is_active = true
        AND v.is_online IS NOT FALSE
        AND v.user_id IS NOT NULL
        AND v.is_remote_capable = true
        AND v.vendor_type = ANY (COALESCE(v_lead.vendor_types, ARRAY['wholesaler','retailer','manufacturer']::text[]))
        AND NOT EXISTS (
          SELECT 1 FROM public.lead_notifications ln
          WHERE ln.lead_id = _lead_id AND ln.vendor_id = v.user_id
        )
      ORDER BY v.is_premium DESC, random()
      LIMIT _batch_size
    )
    SELECT COALESCE(array_agg(vendor_id), ARRAY[]::uuid[]) INTO v_picked FROM eligible;

    IF array_length(v_picked, 1) IS NULL THEN
      RETURN jsonb_build_object('done', true, 'reason', 'no_remote_vendors', 'vendor_ids', '[]'::jsonb, 'count', 0, 'notified', 0);
    END IF;

    INSERT INTO public.lead_notifications (lead_id, vendor_id, sub_category_name, status)
    SELECT _lead_id, vid, v_lead.sub_category_name, 'pending'
    FROM unnest(v_picked) AS vid;

    RETURN jsonb_build_object('done', false, 'remote', true, 'vendor_ids', to_jsonb(v_picked), 'count', array_length(v_picked,1), 'notified', array_length(v_picked,1));
  END IF;

  v_user_radius := COALESCE(v_lead.search_radius_km, 10);

  IF _ring_index IS NOT NULL THEN
    CASE _ring_index
      WHEN 0 THEN v_ring_min := 0;   v_ring_max := 1;
      WHEN 1 THEN v_ring_min := 1;   v_ring_max := 2;
      WHEN 2 THEN v_ring_min := 2;   v_ring_max := 5;
      WHEN 3 THEN v_ring_min := 5;   v_ring_max := 10;
      ELSE
        v_ring_min := 10;
        v_ring_max := CASE WHEN v_user_radius = 0 THEN 50 ELSE v_user_radius END;
    END CASE;
  ELSE
    v_ring_min := 0;
    v_ring_max := CASE WHEN v_user_radius = 0 THEN 50 ELSE v_user_radius END;
  END IF;

  v_hard_max := CASE WHEN v_user_radius = 0 THEN 50 ELSE LEAST(v_ring_max, v_user_radius) END;

  WITH eligible AS (
    SELECT
      v.id AS vendor_id,
      v.is_premium,
      CASE
        WHEN v.operation_mode = 'dynamic'
             AND v.live_lat IS NOT NULL AND v.live_lng IS NOT NULL
             AND v.location_updated_at IS NOT NULL
             AND v.location_updated_at > (now() - v_stale_after)
          THEN v.live_lat
        ELSE v.lat
      END AS eff_lat,
      CASE
        WHEN v.operation_mode = 'dynamic'
             AND v.live_lat IS NOT NULL AND v.live_lng IS NOT NULL
             AND v.location_updated_at IS NOT NULL
             AND v.location_updated_at > (now() - v_stale_after)
          THEN v.live_lng
        ELSE v.lng
      END AS eff_lng,
      COALESCE(v.service_radius_km, 10) AS vendor_radius
    FROM public.vendors v
    WHERE v.is_active = true
      AND v.is_online IS NOT FALSE
      AND v.user_id IS NOT NULL
      AND v.vendor_type = ANY (COALESCE(v_lead.vendor_types, ARRAY['wholesaler','retailer','manufacturer']::text[]))
      AND NOT EXISTS (
        SELECT 1 FROM public.lead_notifications ln
        WHERE ln.lead_id = _lead_id AND ln.vendor_id = v.user_id
      )
  ),
  scored AS (
    SELECT
      e.vendor_id,
      e.is_premium,
      (
        6371 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians(v_lead.lat)) * cos(radians(e.eff_lat)) *
            cos(radians(e.eff_lng) - radians(v_lead.lng)) +
            sin(radians(v_lead.lat)) * sin(radians(e.eff_lat))
          ))
        )
      ) AS distance_km,
      e.vendor_radius
    FROM eligible e
    WHERE e.eff_lat IS NOT NULL AND e.eff_lng IS NOT NULL
      AND v_lead.lat IS NOT NULL AND v_lead.lng IS NOT NULL
  ),
  filtered AS (
    SELECT s.vendor_id, s.distance_km, s.is_premium
    FROM scored s
    WHERE s.distance_km >= v_ring_min
      AND s.distance_km <  v_ring_max
      AND (s.vendor_radius = 0 OR s.distance_km <= s.vendor_radius)
      AND (v_user_radius = 0 OR s.distance_km <= v_user_radius)
      AND s.distance_km <= v_hard_max
    ORDER BY s.is_premium DESC, s.distance_km ASC
    LIMIT _batch_size
  )
  SELECT COALESCE(array_agg(vendor_id), ARRAY[]::uuid[]) INTO v_picked FROM filtered;

  IF array_length(v_picked, 1) IS NULL OR array_length(v_picked, 1) = 0 THEN
    RETURN jsonb_build_object(
      'done', false, 'ring_empty', true, 'ring_index', _ring_index,
      'ring_min', v_ring_min, 'ring_max', v_ring_max,
      'vendor_ids', '[]'::jsonb, 'count', 0, 'notified', 0
    );
  END IF;

  INSERT INTO public.lead_notifications (lead_id, vendor_id, sub_category_name, status)
  SELECT _lead_id, vid, v_lead.sub_category_name, 'pending'
  FROM unnest(v_picked) AS vid;

  RETURN jsonb_build_object(
    'done', false, 'ring_index', _ring_index,
    'ring_min', v_ring_min, 'ring_max', v_ring_max,
    'vendor_ids', to_jsonb(v_picked),
    'count', array_length(v_picked, 1),
    'notified', array_length(v_picked, 1)
  );
END;
$function$;

-- Feedback / Support
CREATE TABLE IF NOT EXISTS public.feedback_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  reporter_role text NOT NULL DEFAULT 'user', -- 'user' | 'vendor' | 'technical'
  page_path text,
  page_title text,
  message text NOT NULL,
  screenshot_url text,
  user_agent text,
  viewport text,
  status text NOT NULL DEFAULT 'open', -- open | in_progress | resolved | closed
  admin_notes text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback_reports TO authenticated;
GRANT INSERT ON public.feedback_reports TO anon;
GRANT ALL ON public.feedback_reports TO service_role;

ALTER TABLE public.feedback_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit feedback" ON public.feedback_reports
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users view own feedback" ON public.feedback_reports
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR is_admin_user(auth.uid()));

CREATE POLICY "Admins update feedback" ON public.feedback_reports
  FOR UPDATE TO authenticated
  USING (is_admin_user(auth.uid()));

CREATE POLICY "Admins delete feedback" ON public.feedback_reports
  FOR DELETE TO authenticated
  USING (is_admin_user(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_feedback_reports_created ON public.feedback_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_reports_role_status ON public.feedback_reports(reporter_role, status);

-- Public storage bucket for feedback screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('feedback-screenshots', 'feedback-screenshots', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can upload feedback screenshots" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'feedback-screenshots');

CREATE POLICY "Public can read feedback screenshots" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'feedback-screenshots');
