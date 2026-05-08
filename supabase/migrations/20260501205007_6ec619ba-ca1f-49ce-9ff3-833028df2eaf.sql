-- Add admin control columns to customers
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;

-- Add admin control columns to vendors
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;

-- Add admin control columns to staff_profiles
ALTER TABLE public.staff_profiles
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;

-- Notifications table for admin -> user popup messages
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins insert notifications"
  ON public.admin_notifications FOR INSERT TO authenticated
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "Admins view all notifications"
  ON public.admin_notifications FOR SELECT TO authenticated
  USING (is_admin_user(auth.uid()) OR auth.uid() = user_id);

CREATE POLICY "Admins delete notifications"
  ON public.admin_notifications FOR DELETE TO authenticated
  USING (is_admin_user(auth.uid()));

CREATE POLICY "Users update own notifications read state"
  ON public.admin_notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR is_admin_user(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_admin_notif_user ON public.admin_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_customers_assigned ON public.customers(assigned_to);
CREATE INDEX IF NOT EXISTS idx_vendors_assigned ON public.vendors(assigned_to);
CREATE INDEX IF NOT EXISTS idx_staff_assigned ON public.staff_profiles(assigned_to);