-- 1. Add is_blocked + status to customers
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Allow admins to view/update all customers
DROP POLICY IF EXISTS "Admins view all customers" ON public.customers;
CREATE POLICY "Admins view all customers" ON public.customers
  FOR SELECT TO authenticated
  USING (is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Admins update all customers" ON public.customers;
CREATE POLICY "Admins update all customers" ON public.customers
  FOR UPDATE TO authenticated
  USING (is_admin_user(auth.uid()));

-- 2. Vendors table
CREATE TABLE IF NOT EXISTS public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  -- Step 1
  role text,
  owner_name text,
  entity text,
  trade text,
  deals_in text,
  business_name text,
  whatsapp text,
  manager_email text,
  referral text,
  -- Step 2
  instagram text,
  facebook text,
  website text,
  -- Step 3
  aadhaar text,
  pan text,
  gst text,
  -- Plan + lifecycle
  plan text,
  is_blocked boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors view own row" ON public.vendors
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR is_admin_user(auth.uid()));

CREATE POLICY "Vendors insert own row" ON public.vendors
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Vendors update own row" ON public.vendors
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR is_admin_user(auth.uid()));

CREATE POLICY "Admins delete vendors" ON public.vendors
  FOR DELETE TO authenticated
  USING (is_admin_user(auth.uid()));

CREATE TRIGGER vendors_set_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Staff profiles table
CREATE TABLE IF NOT EXISTS public.staff_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  name text,
  email text,
  phone text,
  department text,
  designation text,
  avatar_url text,
  is_blocked boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view own profile" ON public.staff_profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR is_admin_user(auth.uid()));

CREATE POLICY "Staff insert own profile" ON public.staff_profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins update staff" ON public.staff_profiles
  FOR UPDATE TO authenticated
  USING (is_admin_user(auth.uid()));

CREATE POLICY "Admins delete staff" ON public.staff_profiles
  FOR DELETE TO authenticated
  USING (is_admin_user(auth.uid()));

CREATE TRIGGER staff_profiles_set_updated_at
  BEFORE UPDATE ON public.staff_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Admin dashboard stats function (aggregated counts)
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT jsonb_build_object(
    'customers', jsonb_build_object(
      'total', (SELECT count(*) FROM customers),
      'week',  (SELECT count(*) FROM customers WHERE created_at > now() - interval '7 days'),
      'month', (SELECT count(*) FROM customers WHERE created_at > now() - interval '30 days'),
      'blocked', (SELECT count(*) FROM customers WHERE is_blocked = true)
    ),
    'vendors', jsonb_build_object(
      'total', (SELECT count(*) FROM vendors),
      'week',  (SELECT count(*) FROM vendors WHERE created_at > now() - interval '7 days'),
      'month', (SELECT count(*) FROM vendors WHERE created_at > now() - interval '30 days'),
      'blocked', (SELECT count(*) FROM vendors WHERE is_blocked = true)
    ),
    'staff', jsonb_build_object(
      'total', (SELECT count(*) FROM staff_profiles),
      'week',  (SELECT count(*) FROM staff_profiles WHERE created_at > now() - interval '7 days'),
      'month', (SELECT count(*) FROM staff_profiles WHERE created_at > now() - interval '30 days'),
      'blocked', (SELECT count(*) FROM staff_profiles WHERE is_blocked = true)
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_stats() FROM public;
GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO authenticated;