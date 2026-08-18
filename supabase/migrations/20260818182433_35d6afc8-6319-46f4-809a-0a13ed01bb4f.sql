-- Split the over-broad UPDATE policy into customer/admin vs vendor scopes.
DROP POLICY IF EXISTS "Customers update own leads" ON public.leads;

CREATE POLICY "Customers and admins update own leads"
ON public.leads
FOR UPDATE
TO authenticated
USING (auth.uid() = customer_id OR is_admin_user(auth.uid()))
WITH CHECK (auth.uid() = customer_id OR is_admin_user(auth.uid()));

CREATE POLICY "Accepted vendors update lead status only"
ON public.leads
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND auth.uid() IS DISTINCT FROM customer_id
  AND (
    auth.uid() = accepted_vendor_id
    OR auth.uid() = ANY (COALESCE(accepted_vendor_ids, ARRAY[]::uuid[]))
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND auth.uid() IS DISTINCT FROM customer_id
  AND (
    auth.uid() = accepted_vendor_id
    OR auth.uid() = ANY (COALESCE(accepted_vendor_ids, ARRAY[]::uuid[]))
  )
);

-- Column-level enforcement: a vendor updating a lead they merely accepted may
-- only move the status; everything else is restored from the old row.
CREATE OR REPLACE FUNCTION public.leads_freeze_assignment_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_user = 'authenticated' AND NOT is_admin_user(auth.uid()) THEN
    NEW.customer_id := OLD.customer_id;
    NEW.accepted_vendor_id := OLD.accepted_vendor_id;
    NEW.accepted_vendor_ids := OLD.accepted_vendor_ids;
    NEW.lead_price_inr := OLD.lead_price_inr;
    -- customers may only clear their approval; setting one goes through the RPC
    IF NEW.customer_approved_vendor_id IS NOT NULL THEN
      NEW.customer_approved_vendor_id := OLD.customer_approved_vendor_id;
    END IF;

    -- Non-owner (vendor) writes: status is the only editable column.
    IF auth.uid() IS DISTINCT FROM OLD.customer_id THEN
      NEW.customer_name := OLD.customer_name;
      NEW.customer_phone := OLD.customer_phone;
      NEW.type_id := OLD.type_id;
      NEW.root_category_id := OLD.root_category_id;
      NEW.sub_category_id := OLD.sub_category_id;
      NEW.sub_category_name := OLD.sub_category_name;
      NEW.item_ids := OLD.item_ids;
      NEW.item_names := OLD.item_names;
      NEW.note := OLD.note;
      NEW.images := OLD.images;
      NEW.lat := OLD.lat;
      NEW.lng := OLD.lng;
      NEW.address := OLD.address;
      NEW.max_slots := OLD.max_slots;
      NEW.accepted_count := OLD.accepted_count;
      NEW.source := OLD.source;
      NEW.lead_rating := OLD.lead_rating;
      NEW.lead_review := OLD.lead_review;
      NEW.search_radius_km := OLD.search_radius_km;
      NEW.radius_km := OLD.radius_km;
      NEW.vendor_types := OLD.vendor_types;
      NEW.is_remote := OLD.is_remote;
      NEW.group_name := OLD.group_name;
      NEW.is_marketplace := OLD.is_marketplace;
      NEW.marketplace_reason := OLD.marketplace_reason;
      NEW.marketplace_at := OLD.marketplace_at;
      NEW.created_at := OLD.created_at;
      NEW.accepted_at := OLD.accepted_at;
      NEW.customer_approved_vendor_id := OLD.customer_approved_vendor_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
