
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS auto_accept_leads boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS service_radius_km integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS lead_rating integer,
  ADD COLUMN IF NOT EXISTS lead_review text;

CREATE OR REPLACE FUNCTION public.auto_accept_on_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _auto boolean;
  _lead public.leads%ROWTYPE;
  _new_count int;
BEGIN
  SELECT COALESCE(auto_accept_leads, false) INTO _auto
    FROM public.vendors WHERE user_id = NEW.vendor_id;
  IF NOT _auto THEN
    RETURN NEW;
  END IF;

  SELECT * INTO _lead FROM public.leads WHERE id = NEW.lead_id FOR UPDATE;
  IF _lead.id IS NULL OR _lead.accepted_count >= _lead.max_slots THEN
    RETURN NEW;
  END IF;
  IF NEW.vendor_id = ANY(_lead.accepted_vendor_ids) THEN
    RETURN NEW;
  END IF;

  _new_count := _lead.accepted_count + 1;
  UPDATE public.leads
    SET accepted_vendor_ids = array_append(accepted_vendor_ids, NEW.vendor_id),
        accepted_count = _new_count,
        accepted_vendor_id = COALESCE(accepted_vendor_id, NEW.vendor_id),
        accepted_at = COALESCE(accepted_at, now()),
        status = CASE WHEN _new_count >= max_slots THEN 'fulfilled' ELSE 'accepted' END,
        updated_at = now()
    WHERE id = NEW.lead_id;

  NEW.status := 'accepted';
  NEW.responded_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_accept_on_notify ON public.lead_notifications;
CREATE TRIGGER trg_auto_accept_on_notify
  BEFORE INSERT ON public.lead_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_accept_on_notify();

DROP FUNCTION IF EXISTS public.get_lead_accepted_vendors(uuid);

CREATE OR REPLACE FUNCTION public.get_lead_accepted_vendors(_lead_id uuid)
RETURNS TABLE(
  vendor_id uuid,
  business_name text,
  owner_name text,
  avatar_url text,
  whatsapp text,
  phone text,
  email text,
  rating numeric,
  total_reviews int,
  distance_km numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH lead_row AS (
    SELECT * FROM public.leads WHERE id = _lead_id
  ), accepted_vendor_ids AS (
    SELECT unnest(l.accepted_vendor_ids) AS vendor_user_id FROM lead_row l
    UNION
    SELECT n.vendor_id FROM public.lead_notifications n
      WHERE n.lead_id = _lead_id AND n.status = 'accepted'
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
    END AS distance_km
  FROM lead_row l
  JOIN accepted_vendor_ids a ON true
  JOIN public.vendors v ON v.user_id = a.vendor_user_id
  WHERE COALESCE(v.is_blocked, false) = false
    AND (auth.uid() = l.customer_id OR auth.uid() = a.vendor_user_id OR is_admin_user(auth.uid()))
  ORDER BY v.user_id, v.updated_at DESC;
$$;
