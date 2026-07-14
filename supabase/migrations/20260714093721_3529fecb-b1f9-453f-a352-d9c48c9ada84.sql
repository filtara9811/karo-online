
ALTER TABLE public.vendor_scan_history
  ADD COLUMN IF NOT EXISTS confidence numeric,
  ADD COLUMN IF NOT EXISTS field_confidence jsonb,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'complete';

CREATE INDEX IF NOT EXISTS idx_vendor_scan_history_status ON public.vendor_scan_history(status);
CREATE INDEX IF NOT EXISTS idx_vendor_scan_history_created_at ON public.vendor_scan_history(created_at DESC);

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS auto_scan_confidence numeric;
