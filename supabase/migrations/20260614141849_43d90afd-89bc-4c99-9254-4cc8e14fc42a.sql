
-- 1) Tighten leads SELECT: remove the standalone accepted_vendor_id branch
--    so the customer_approved_vendor_id check always applies.
DROP POLICY IF EXISTS leads_select_authorized ON public.leads;
CREATE POLICY leads_select_authorized ON public.leads
FOR SELECT
USING (
  customer_id = auth.uid()
  OR is_admin_user(auth.uid())
  OR (
    (
      auth.uid() = ANY (COALESCE(accepted_vendor_ids, ARRAY[]::uuid[]))
      OR auth.uid() = accepted_vendor_id
    )
    AND (
      customer_approved_vendor_id IS NULL
      OR customer_approved_vendor_id = auth.uid()
    )
  )
);

-- 2) Remove customer_name and customer_phone from realtime broadcast on leads.
ALTER PUBLICATION supabase_realtime DROP TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads (
  id, customer_id, type_id, root_category_id, sub_category_id, sub_category_name,
  item_ids, item_names, note, images, status, accepted_vendor_id, accepted_at,
  lat, lng, address, created_at, updated_at, max_slots, accepted_count,
  lead_price_inr, accepted_vendor_ids, source, lead_rating, lead_review,
  customer_approved_vendor_id, search_radius_km, vendor_types, is_remote
);

-- 3) Align chat-media storage policies to the lead-folder convention used by SELECT.
DROP POLICY IF EXISTS "chat-media owner insert" ON storage.objects;
DROP POLICY IF EXISTS "chat-media owner update" ON storage.objects;
DROP POLICY IF EXISTS "chat-media owner delete" ON storage.objects;

CREATE POLICY "chat-media participants insert" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'chat-media'
  AND auth.uid() IS NOT NULL
  AND (
    is_admin_user(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id::text = (storage.foldername(name))[1]
        AND (
          l.customer_id = auth.uid()
          OR auth.uid() = ANY (COALESCE(l.accepted_vendor_ids, ARRAY[]::uuid[]))
          OR auth.uid() = l.accepted_vendor_id
        )
    )
  )
);

CREATE POLICY "chat-media participants update" ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'chat-media'
  AND auth.uid() IS NOT NULL
  AND (
    is_admin_user(auth.uid())
    OR (owner = auth.uid())
  )
);

CREATE POLICY "chat-media participants delete" ON storage.objects
FOR DELETE
USING (
  bucket_id = 'chat-media'
  AND auth.uid() IS NOT NULL
  AND (
    is_admin_user(auth.uid())
    OR (owner = auth.uid())
  )
);
