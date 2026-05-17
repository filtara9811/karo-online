ALTER TABLE public.vendor_status_updates
  ADD COLUMN IF NOT EXISTS customer_read_at timestamptz;

UPDATE public.vendor_status_updates
SET customer_read_at = created_at
WHERE customer_read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_vsu_customer_unread
ON public.vendor_status_updates(lead_id, customer_read_at, created_at DESC);

DROP POLICY IF EXISTS "Customer marks own status updates read" ON public.vendor_status_updates;
CREATE POLICY "Customer marks own status updates read"
ON public.vendor_status_updates
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_id
      AND l.customer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_id
      AND l.customer_id = auth.uid()
  )
);