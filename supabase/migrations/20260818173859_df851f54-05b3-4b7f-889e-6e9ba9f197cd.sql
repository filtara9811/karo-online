-- 1) Service menu config row (admin-toggleable)
INSERT INTO public.app_settings (key, value)
VALUES ('service_menu', jsonb_build_object('services', jsonb_build_array(
  jsonb_build_object('id','quick','enabled',true,'order',1),
  jsonb_build_object('id','digital_shop','enabled',true,'order',2),
  jsonb_build_object('id','vendor_panel','enabled',true,'order',3),
  jsonb_build_object('id','digital_qr','enabled',true,'order',4)
)))
ON CONFLICT (key) DO NOTHING;

DROP POLICY IF EXISTS "Public can view safe app settings" ON public.app_settings;
CREATE POLICY "Public can view safe app settings" ON public.app_settings
FOR SELECT TO anon
USING (key = ANY (ARRAY['social_links','no_vendor_state','lead_defaults','vendor_app','vendor_onboarding_video','home_banners','home_videos','service_menu']));

DROP POLICY IF EXISTS "Authenticated can view safe app settings" ON public.app_settings;
CREATE POLICY "Authenticated can view safe app settings" ON public.app_settings
FOR SELECT TO authenticated
USING (
  key = ANY (ARRAY['social_links','no_vendor_state','lead_defaults','vendor_app','vendor_onboarding_video','home_banners','home_videos','service_menu'])
  OR is_admin_user(auth.uid())
);

-- 2) Freeze admin/payment-controlled vendor columns against self-service edits
CREATE OR REPLACE FUNCTION public.vendors_freeze_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_service_role_request() OR public.is_admin_user(auth.uid()) THEN
    RETURN NEW;
  END IF;

  NEW.is_blocked := OLD.is_blocked;
  NEW.verified := OLD.verified;
  NEW.is_premium := OLD.is_premium;
  NEW.payment_completed := OLD.payment_completed;
  NEW.subscription_expires_at := OLD.subscription_expires_at;
  NEW.status := OLD.status;
  NEW.assigned_to := OLD.assigned_to;
  NEW.admin_notes := OLD.admin_notes;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vendors_freeze_admin_fields ON public.vendors;
CREATE TRIGGER vendors_freeze_admin_fields
BEFORE UPDATE ON public.vendors
FOR EACH ROW EXECUTE FUNCTION public.vendors_freeze_admin_fields();