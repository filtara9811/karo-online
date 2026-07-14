
-- ============ ROLES ============
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'staff';

-- ============ ENUMS ============
DO $$ BEGIN CREATE TYPE public.staff_status AS ENUM ('pending','active','suspended','soon');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.staff_payout_model AS ENUM ('per_task','monthly','hybrid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.staff_task_status AS ENUM ('assigned','in_progress','submitted','approved','rejected','paid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.staff_task_type AS ENUM ('vendor_onboarding','verification','follow_up','custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.staff_ledger_kind AS ENUM ('task_earned','salary_credit','withdrawal','adjustment');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.staff_withdrawal_status AS ENUM ('pending','approved','paid','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.staff_chat_type AS ENUM ('direct','group','vendor_thread','broadcast');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ EXTEND staff_profiles ============
ALTER TABLE public.staff_profiles
  ADD COLUMN IF NOT EXISTS employee_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS staff_status public.staff_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payout_model public.staff_payout_model NOT NULL DEFAULT 'per_task',
  ADD COLUMN IF NOT EXISTS monthly_salary_inr NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS upi_id TEXT;

-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public._is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin_user(auth.uid());
$$;

-- ============ staff_signup_requests ============
CREATE TABLE IF NOT EXISTS public.staff_signup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  decision_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_signup_requests TO authenticated;
GRANT ALL ON public.staff_signup_requests TO service_role;
ALTER TABLE public.staff_signup_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signup_requests_admin_all" ON public.staff_signup_requests
  FOR ALL TO authenticated USING (public._is_admin()) WITH CHECK (public._is_admin());
CREATE POLICY "signup_requests_self_read" ON public.staff_signup_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "signup_requests_self_insert" ON public.staff_signup_requests
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'pending');
CREATE TRIGGER trg_staff_signup_requests_updated
  BEFORE UPDATE ON public.staff_signup_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ staff_category_assignments ============
CREATE TABLE IF NOT EXISTS public.staff_category_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  can_onboard BOOLEAN NOT NULL DEFAULT true,
  can_edit BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(staff_id, category_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_category_assignments TO authenticated;
GRANT ALL ON public.staff_category_assignments TO service_role;
ALTER TABLE public.staff_category_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sca_admin_all" ON public.staff_category_assignments
  FOR ALL TO authenticated USING (public._is_admin()) WITH CHECK (public._is_admin());
CREATE POLICY "sca_self_read" ON public.staff_category_assignments
  FOR SELECT TO authenticated
  USING (staff_id IN (SELECT id FROM public.staff_profiles WHERE user_id = auth.uid()));

-- ============ staff_permissions ============
CREATE TABLE IF NOT EXISTS public.staff_permissions (
  staff_id UUID PRIMARY KEY REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  perms JSONB NOT NULL DEFAULT '{"onboard_vendor":true,"edit_vendor":true,"chat_vendor":true,"view_leads":false,"withdraw_payout":true}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_permissions TO authenticated;
GRANT ALL ON public.staff_permissions TO service_role;
ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sp_admin_all" ON public.staff_permissions
  FOR ALL TO authenticated USING (public._is_admin()) WITH CHECK (public._is_admin());
CREATE POLICY "sp_self_read" ON public.staff_permissions
  FOR SELECT TO authenticated
  USING (staff_id IN (SELECT id FROM public.staff_profiles WHERE user_id = auth.uid()));

-- ============ staff_tasks ============
CREATE TABLE IF NOT EXISTS public.staff_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  task_type public.staff_task_type NOT NULL DEFAULT 'vendor_onboarding',
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  amount_inr NUMERIC(12,2) NOT NULL DEFAULT 0,
  status public.staff_task_status NOT NULL DEFAULT 'assigned',
  assigned_by UUID,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  proof_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_staff ON public.staff_tasks(staff_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_tasks TO authenticated;
GRANT ALL ON public.staff_tasks TO service_role;
ALTER TABLE public.staff_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "st_admin_all" ON public.staff_tasks
  FOR ALL TO authenticated USING (public._is_admin()) WITH CHECK (public._is_admin());
CREATE POLICY "st_self_read" ON public.staff_tasks
  FOR SELECT TO authenticated
  USING (staff_id IN (SELECT id FROM public.staff_profiles WHERE user_id = auth.uid()));
CREATE POLICY "st_self_update_progress" ON public.staff_tasks
  FOR UPDATE TO authenticated
  USING (staff_id IN (SELECT id FROM public.staff_profiles WHERE user_id = auth.uid()))
  WITH CHECK (staff_id IN (SELECT id FROM public.staff_profiles WHERE user_id = auth.uid()));
CREATE TRIGGER trg_staff_tasks_updated
  BEFORE UPDATE ON public.staff_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.staff_tasks_guard()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public._is_admin() THEN RETURN NEW; END IF;
  IF NEW.staff_id IS DISTINCT FROM OLD.staff_id
     OR NEW.amount_inr IS DISTINCT FROM OLD.amount_inr
     OR NEW.assigned_by IS DISTINCT FROM OLD.assigned_by
     OR NEW.task_type IS DISTINCT FROM OLD.task_type
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.admin_note IS DISTINCT FROM OLD.admin_note THEN
    RAISE EXCEPTION 'Staff cannot modify privileged task fields';
  END IF;
  IF NEW.status NOT IN ('in_progress','submitted') THEN
    RAISE EXCEPTION 'Staff can only set status to in_progress or submitted';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_staff_tasks_guard
  BEFORE UPDATE ON public.staff_tasks
  FOR EACH ROW EXECUTE FUNCTION public.staff_tasks_guard();

-- ============ staff_wallets ============
CREATE TABLE IF NOT EXISTS public.staff_wallets (
  staff_id UUID PRIMARY KEY REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  balance_inr NUMERIC(12,2) NOT NULL DEFAULT 0,
  lifetime_earned NUMERIC(12,2) NOT NULL DEFAULT 0,
  lifetime_withdrawn NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.staff_wallets TO authenticated;
GRANT ALL ON public.staff_wallets TO service_role;
ALTER TABLE public.staff_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sw_admin_all" ON public.staff_wallets
  FOR ALL TO authenticated USING (public._is_admin()) WITH CHECK (public._is_admin());
CREATE POLICY "sw_self_read" ON public.staff_wallets
  FOR SELECT TO authenticated
  USING (staff_id IN (SELECT id FROM public.staff_profiles WHERE user_id = auth.uid()));

-- ============ staff_wallet_ledger ============
CREATE TABLE IF NOT EXISTS public.staff_wallet_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  kind public.staff_ledger_kind NOT NULL,
  amount_inr NUMERIC(12,2) NOT NULL,
  ref_id UUID,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_swl_staff ON public.staff_wallet_ledger(staff_id, created_at DESC);
GRANT SELECT ON public.staff_wallet_ledger TO authenticated;
GRANT ALL ON public.staff_wallet_ledger TO service_role;
ALTER TABLE public.staff_wallet_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "swl_admin_all" ON public.staff_wallet_ledger
  FOR ALL TO authenticated USING (public._is_admin()) WITH CHECK (public._is_admin());
CREATE POLICY "swl_self_read" ON public.staff_wallet_ledger
  FOR SELECT TO authenticated
  USING (staff_id IN (SELECT id FROM public.staff_profiles WHERE user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.staff_profile_after_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.staff_wallets(staff_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.staff_permissions(staff_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_staff_profile_after_insert ON public.staff_profiles;
CREATE TRIGGER trg_staff_profile_after_insert
  AFTER INSERT ON public.staff_profiles
  FOR EACH ROW EXECUTE FUNCTION public.staff_profile_after_insert();

CREATE OR REPLACE FUNCTION public.staff_ledger_after_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.kind IN ('task_earned','salary_credit','adjustment') THEN
    UPDATE public.staff_wallets
      SET balance_inr = balance_inr + NEW.amount_inr,
          lifetime_earned = lifetime_earned + GREATEST(NEW.amount_inr, 0),
          updated_at = now()
      WHERE staff_id = NEW.staff_id;
  ELSIF NEW.kind = 'withdrawal' THEN
    UPDATE public.staff_wallets
      SET balance_inr = balance_inr - NEW.amount_inr,
          lifetime_withdrawn = lifetime_withdrawn + NEW.amount_inr,
          updated_at = now()
      WHERE staff_id = NEW.staff_id;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_staff_ledger_after_insert ON public.staff_wallet_ledger;
CREATE TRIGGER trg_staff_ledger_after_insert
  AFTER INSERT ON public.staff_wallet_ledger
  FOR EACH ROW EXECUTE FUNCTION public.staff_ledger_after_insert();

-- ============ staff_withdrawal_requests ============
CREATE TABLE IF NOT EXISTS public.staff_withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  amount_inr NUMERIC(12,2) NOT NULL CHECK (amount_inr > 0),
  upi_id TEXT NOT NULL,
  status public.staff_withdrawal_status NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  utr TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_withdrawal_requests TO authenticated;
GRANT ALL ON public.staff_withdrawal_requests TO service_role;
ALTER TABLE public.staff_withdrawal_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "swr_admin_all" ON public.staff_withdrawal_requests
  FOR ALL TO authenticated USING (public._is_admin()) WITH CHECK (public._is_admin());
CREATE POLICY "swr_self_read" ON public.staff_withdrawal_requests
  FOR SELECT TO authenticated
  USING (staff_id IN (SELECT id FROM public.staff_profiles WHERE user_id = auth.uid()));
CREATE POLICY "swr_self_insert" ON public.staff_withdrawal_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    status = 'pending'
    AND staff_id IN (SELECT id FROM public.staff_profiles WHERE user_id = auth.uid())
  );
CREATE TRIGGER trg_swr_updated
  BEFORE UPDATE ON public.staff_withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ CHAT ============
CREATE TABLE IF NOT EXISTS public.staff_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_type public.staff_chat_type NOT NULL,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  title TEXT,
  created_by UUID NOT NULL,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_chats TO authenticated;
GRANT ALL ON public.staff_chats TO service_role;
ALTER TABLE public.staff_chats ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.staff_chat_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.staff_chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  member_role TEXT NOT NULL DEFAULT 'member',
  last_read_at TIMESTAMPTZ,
  muted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(chat_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_scm_user ON public.staff_chat_members(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_chat_members TO authenticated;
GRANT ALL ON public.staff_chat_members TO service_role;
ALTER TABLE public.staff_chat_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_chat_member(_chat_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_chat_members
    WHERE chat_id = _chat_id AND user_id = auth.uid()
  );
$$;

CREATE POLICY "sc_admin_all" ON public.staff_chats
  FOR ALL TO authenticated USING (public._is_admin()) WITH CHECK (public._is_admin());
CREATE POLICY "sc_member_read" ON public.staff_chats
  FOR SELECT TO authenticated USING (public.is_chat_member(id));
CREATE POLICY "sc_insert_self" ON public.staff_chats
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

CREATE POLICY "scm_admin_all" ON public.staff_chat_members
  FOR ALL TO authenticated USING (public._is_admin()) WITH CHECK (public._is_admin());
CREATE POLICY "scm_self_read" ON public.staff_chat_members
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_chat_member(chat_id));
CREATE POLICY "scm_self_update" ON public.staff_chat_members
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "scm_creator_insert" ON public.staff_chat_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR chat_id IN (SELECT id FROM public.staff_chats WHERE created_by = auth.uid())
  );

CREATE TABLE IF NOT EXISTS public.staff_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.staff_chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  body TEXT,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  reply_to UUID,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_scmsg_chat ON public.staff_chat_messages(chat_id, sent_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_chat_messages TO authenticated;
GRANT ALL ON public.staff_chat_messages TO service_role;
ALTER TABLE public.staff_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scmsg_admin_all" ON public.staff_chat_messages
  FOR ALL TO authenticated USING (public._is_admin()) WITH CHECK (public._is_admin());
CREATE POLICY "scmsg_member_read" ON public.staff_chat_messages
  FOR SELECT TO authenticated USING (public.is_chat_member(chat_id));
CREATE POLICY "scmsg_member_insert" ON public.staff_chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.is_chat_member(chat_id));
CREATE POLICY "scmsg_sender_update" ON public.staff_chat_messages
  FOR UPDATE TO authenticated USING (sender_id = auth.uid()) WITH CHECK (sender_id = auth.uid());

CREATE OR REPLACE FUNCTION public.chat_message_after_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.staff_chats SET last_message_at = NEW.sent_at, updated_at = now()
  WHERE id = NEW.chat_id;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_chat_message_after_insert ON public.staff_chat_messages;
CREATE TRIGGER trg_chat_message_after_insert
  AFTER INSERT ON public.staff_chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.chat_message_after_insert();

ALTER TABLE public.staff_chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.staff_chats REPLICA IDENTITY FULL;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_chat_messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_chats;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ SECURITY FIXES ============

CREATE OR REPLACE FUNCTION public.kyc_verifications_guard()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public._is_admin() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS NOT NULL AND NEW.status NOT IN ('pending','todo','submitted') THEN
      RAISE EXCEPTION 'Only admins can set KYC status to %', NEW.status;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NEW.status NOT IN ('pending','todo','submitted') THEN
      RAISE EXCEPTION 'Only admins can change KYC status to %', NEW.status;
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_kyc_guard_ins ON public.kyc_verifications;
DROP TRIGGER IF EXISTS trg_kyc_guard_upd ON public.kyc_verifications;
CREATE TRIGGER trg_kyc_guard_ins
  BEFORE INSERT ON public.kyc_verifications
  FOR EACH ROW EXECUTE FUNCTION public.kyc_verifications_guard();
CREATE TRIGGER trg_kyc_guard_upd
  BEFORE UPDATE ON public.kyc_verifications
  FOR EACH ROW EXECUTE FUNCTION public.kyc_verifications_guard();

CREATE OR REPLACE FUNCTION public.merchant_link_settings_guard()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public._is_admin() THEN RETURN NEW; END IF;
  IF NEW.premium_unlocked IS DISTINCT FROM OLD.premium_unlocked
     OR NEW.premium_paid_at IS DISTINCT FROM OLD.premium_paid_at
     OR NEW.premium_payment_ref IS DISTINCT FROM OLD.premium_payment_ref THEN
    RAISE EXCEPTION 'Only admins can modify premium unlock fields';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_mls_guard ON public.merchant_link_settings;
CREATE TRIGGER trg_mls_guard
  BEFORE UPDATE ON public.merchant_link_settings
  FOR EACH ROW EXECUTE FUNCTION public.merchant_link_settings_guard();

CREATE OR REPLACE FUNCTION public.merchant_link_settings_insert_guard()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public._is_admin() THEN RETURN NEW; END IF;
  IF COALESCE(NEW.premium_unlocked, false) = true
     OR NEW.premium_paid_at IS NOT NULL
     OR NEW.premium_payment_ref IS NOT NULL THEN
    RAISE EXCEPTION 'Only admins can create rows with premium unlocked';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_mls_insert_guard ON public.merchant_link_settings;
CREATE TRIGGER trg_mls_insert_guard
  BEFORE INSERT ON public.merchant_link_settings
  FOR EACH ROW EXECUTE FUNCTION public.merchant_link_settings_insert_guard();

CREATE OR REPLACE FUNCTION public.vendors_payment_guard()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public._is_admin() THEN RETURN NEW; END IF;
  IF NEW.payment_completed IS DISTINCT FROM OLD.payment_completed
     OR NEW.payment_completed_at IS DISTINCT FROM OLD.payment_completed_at THEN
    RAISE EXCEPTION 'Only admins can change payment_completed';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_vendors_payment_guard ON public.vendors;
CREATE TRIGGER trg_vendors_payment_guard
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.vendors_payment_guard();
