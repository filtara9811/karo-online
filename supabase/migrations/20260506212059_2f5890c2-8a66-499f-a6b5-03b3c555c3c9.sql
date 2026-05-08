
-- Super admin: wipe ALL test data (customers, vendors, leads, wallets) but keep admins/staff and config
CREATE OR REPLACE FUNCTION public.wipe_all_test_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _deleted jsonb;
  _c_users uuid[];
  _v_users uuid[];
BEGIN
  IF NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Only super_admin can wipe test data';
  END IF;

  -- Collect non-admin user ids to also delete from auth.users
  SELECT COALESCE(array_agg(c.user_id), '{}') INTO _c_users
    FROM customers c
    WHERE NOT is_admin_user(c.user_id);
  SELECT COALESCE(array_agg(v.user_id), '{}') INTO _v_users
    FROM vendors v
    WHERE NOT is_admin_user(v.user_id);

  DELETE FROM lead_messages;
  DELETE FROM lead_notifications;
  DELETE FROM leads;
  DELETE FROM coin_transfers;
  DELETE FROM wallet_transactions;
  DELETE FROM vendor_item_mappings;
  DELETE FROM vendor_variation_mappings;
  DELETE FROM vendor_wallets;
  DELETE FROM vendors;
  DELETE FROM customers;
  DELETE FROM admin_notifications WHERE NOT is_admin_user(user_id);

  -- Remove auth users for deleted customers/vendors (skip admins)
  DELETE FROM auth.users
    WHERE id = ANY(_c_users) OR id = ANY(_v_users);

  _deleted := jsonb_build_object(
    'customers_users_removed', cardinality(_c_users),
    'vendors_users_removed', cardinality(_v_users),
    'ok', true
  );
  RETURN _deleted;
END;
$$;

-- Approve vendor (super_admin/admin)
CREATE OR REPLACE FUNCTION public.approve_vendor(_vendor_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE vendors SET status = 'active', verified = true, updated_at = now()
    WHERE user_id = _vendor_user_id;
END;
$$;
