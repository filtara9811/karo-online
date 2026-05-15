
ALTER TABLE public.lead_notifications
  ADD COLUMN IF NOT EXISTS vendor_note TEXT,
  ADD COLUMN IF NOT EXISTS quoted_price NUMERIC;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS customer_approved_vendor_id UUID;

DROP FUNCTION IF EXISTS public.get_lead_accepted_vendors(uuid);
CREATE OR REPLACE FUNCTION public.get_lead_accepted_vendors(_lead_id uuid)
 RETURNS TABLE(
   vendor_id uuid, business_name text, owner_name text, avatar_url text,
   whatsapp text, phone text, email text, rating numeric, total_reviews integer,
   distance_km numeric, vendor_note text, quoted_price numeric
 )
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH lead_row AS (
    SELECT * FROM public.leads WHERE id = _lead_id
  ), accepted AS (
    SELECT n.vendor_id AS vendor_user_id, n.vendor_note, n.quoted_price
      FROM public.lead_notifications n
      WHERE n.lead_id = _lead_id AND n.status = 'accepted'
    UNION ALL
    SELECT unnest(l.accepted_vendor_ids), NULL::text, NULL::numeric FROM lead_row l
  ), accepted_dedup AS (
    SELECT DISTINCT ON (vendor_user_id) vendor_user_id, vendor_note, quoted_price
    FROM accepted
    ORDER BY vendor_user_id, vendor_note NULLS LAST
  ), ratings AS (
    SELECT accepted_vendor_id AS vid,
           ROUND(AVG(lead_rating)::numeric, 1) AS avg_rating,
           COUNT(*)::int AS cnt
    FROM public.leads
    WHERE lead_rating IS NOT NULL AND accepted_vendor_id IS NOT NULL
    GROUP BY accepted_vendor_id
  )
  SELECT DISTINCT ON (v.user_id)
    v.user_id,
    v.business_name,
    v.owner_name,
    v.avatar_url,
    v.whatsapp,
    COALESCE(NULLIF(v.whatsapp,''), (SELECT c.phone FROM public.customers c WHERE c.user_id = v.user_id LIMIT 1)) AS phone,
    COALESCE(v.email, v.manager_email, (SELECT c.email FROM public.customers c WHERE c.user_id = v.user_id LIMIT 1)) AS email,
    COALESCE((SELECT avg_rating FROM ratings WHERE vid = v.user_id), 4.8) AS rating,
    COALESCE((SELECT cnt FROM ratings WHERE vid = v.user_id), 0) AS total_reviews,
    CASE
      WHEN v.lat IS NOT NULL AND v.lng IS NOT NULL AND l.lat IS NOT NULL AND l.lng IS NOT NULL THEN
        ROUND((6371 * acos(
          GREATEST(-1, LEAST(1,
            cos(radians(l.lat)) * cos(radians(v.lat)) * cos(radians(v.lng) - radians(l.lng))
            + sin(radians(l.lat)) * sin(radians(v.lat))
          ))
        ))::numeric, 1)
      ELSE NULL
    END AS distance_km,
    a.vendor_note,
    a.quoted_price
  FROM lead_row l
  JOIN accepted_dedup a ON true
  JOIN public.vendors v ON v.user_id = a.vendor_user_id
  WHERE COALESCE(v.is_blocked, false) = false
    AND (auth.uid() = l.customer_id OR auth.uid() = a.vendor_user_id OR is_admin_user(auth.uid()))
  ORDER BY v.user_id, v.updated_at DESC;
$function$;

CREATE OR REPLACE FUNCTION public.customer_approve_vendor(_lead_id uuid, _vendor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _lead public.leads%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'auth_required');
  END IF;
  SELECT * INTO _lead FROM public.leads WHERE id = _lead_id FOR UPDATE;
  IF _lead.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;
  IF _uid <> _lead.customer_id AND NOT is_admin_user(_uid) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authorized');
  END IF;
  IF NOT (_vendor_id = ANY(_lead.accepted_vendor_ids)) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'vendor_not_accepted');
  END IF;
  UPDATE public.leads
    SET customer_approved_vendor_id = _vendor_id,
        status = 'in_progress',
        updated_at = now()
    WHERE id = _lead_id;
  RETURN jsonb_build_object('ok', true);
END;
$function$;
