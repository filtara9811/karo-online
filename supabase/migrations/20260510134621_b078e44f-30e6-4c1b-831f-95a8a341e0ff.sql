
-- ============ FIREBASE SERVICES ============
CREATE TABLE IF NOT EXISTS public.firebase_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  project_id text,
  app_id text,
  sender_id text,
  web_api_key text,
  server_key text,
  service_account_json text,
  assigned_use text NOT NULL DEFAULT 'none',
  is_active boolean NOT NULL DEFAULT false,
  is_test_mode boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.firebase_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage firebase_services" ON public.firebase_services
  FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));
CREATE TRIGGER trg_firebase_services_updated
  BEFORE UPDATE ON public.firebase_services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.firebase_services (service_key, display_name, description, priority) VALUES
  ('auth', 'Firebase Authentication', 'Phone & email auth, Google sign-in, custom tokens', 1),
  ('fcm', 'Cloud Messaging (FCM)', 'Push notifications for Android, iOS & Web', 2),
  ('analytics', 'Firebase Analytics', 'User & event analytics', 3),
  ('crashlytics', 'Crashlytics', 'Crash reporting & stability monitoring', 4),
  ('dynamic_links', 'Dynamic Links', 'Deferred deep links & install attribution', 5),
  ('remote_config', 'Remote Config', 'Feature flags & runtime config', 6)
ON CONFLICT (service_key) DO NOTHING;

-- ============ MAPS SERVICES ============
CREATE TABLE IF NOT EXISTS public.maps_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  api_key text,
  rest_key text,
  map_sdk_key text,
  client_id text,
  client_secret text,
  assigned_use text NOT NULL DEFAULT 'none',
  is_active boolean NOT NULL DEFAULT false,
  is_test_mode boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.maps_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage maps_services" ON public.maps_services
  FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));
CREATE TRIGGER trg_maps_services_updated
  BEFORE UPDATE ON public.maps_services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.maps_services (provider, display_name, description, priority) VALUES
  ('google_maps', 'Google Maps Platform', 'Geocoding, places, directions, static maps', 1),
  ('mappls', 'Mappls (MapmyIndia)', 'India-first maps, hyperlocal search & directions', 2)
ON CONFLICT (provider) DO NOTHING;

-- ============ NOTIFICATION TRIGGERS ============
CREATE TABLE IF NOT EXISTS public.notification_triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  image_url text,
  action_url text,
  notification_type text NOT NULL DEFAULT 'basic',
  channels jsonb NOT NULL DEFAULT '{"push":true,"sms":false,"whatsapp":false,"fallback":["push","whatsapp","sms"]}'::jsonb,
  audience text NOT NULL DEFAULT 'user',
  is_active boolean NOT NULL DEFAULT true,
  schedule_at timestamptz,
  last_fired_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_triggers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage notification_triggers" ON public.notification_triggers
  FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));
CREATE TRIGGER trg_notification_triggers_updated
  BEFORE UPDATE ON public.notification_triggers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.notification_triggers (event_key, display_name, title, body, notification_type, audience) VALUES
  ('order_placed',            'Order placed',           'Order placed ✅',           'Aapka order #{{order_id}} place ho gaya hai.',           'basic',  'user'),
  ('payment_success',         'Payment successful',     'Payment received 💸',       '₹{{amount}} ka payment successful raha. Thanks!',         'basic',  'user'),
  ('payment_failed',          'Payment failed',         'Payment failed ❌',         'Aapka payment fail ho gaya. Please retry karein.',        'banner', 'user'),
  ('kyc_approved',            'KYC approved',           'KYC approved 🎉',           'Aapki KYC verify ho gayi hai. Ab full access milega.',    'basic',  'user'),
  ('vendor_approved',         'Vendor approved',        'Vendor account approved ✨','Aap ab leads accept kar sakte hain.',                     'basic',  'vendor'),
  ('referral_reward_released','Referral reward released','Referral reward credited 🎁','₹{{amount}} aapke wallet me add ho gaye.',               'big_image','user'),
  ('delivery_assigned',       'Delivery assigned',      'Delivery partner on the way 🛵','Order #{{order_id}} ke liye delivery assign ho gayi.','basic',  'user'),
  ('order_delivered',         'Order delivered',        'Order delivered 📦',        'Aapka order deliver ho gaya hai. Enjoy!',                'action', 'user')
ON CONFLICT (event_key) DO NOTHING;

-- ============ NOTIFICATION CAMPAIGNS ============
CREATE TABLE IF NOT EXISTS public.notification_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  image_url text,
  action_url text,
  notification_type text NOT NULL DEFAULT 'basic',
  channels jsonb NOT NULL DEFAULT '{"push":true}'::jsonb,
  target_segment text,
  geo_filter jsonb,
  schedule_at timestamptz,
  status text NOT NULL DEFAULT 'draft',
  sent_count integer NOT NULL DEFAULT 0,
  delivered_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage notification_campaigns" ON public.notification_campaigns
  FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));
CREATE TRIGGER trg_notification_campaigns_updated
  BEFORE UPDATE ON public.notification_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ NOTIFICATION LOGS ============
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_id uuid REFERENCES public.notification_triggers(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES public.notification_campaigns(id) ON DELETE SET NULL,
  user_id uuid,
  device_token text,
  provider text,
  channel text,
  status text NOT NULL,
  error text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created ON public.notification_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user ON public.notification_logs(user_id);
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read notification_logs" ON public.notification_logs
  FOR SELECT TO authenticated
  USING (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins write notification_logs" ON public.notification_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_user(auth.uid()));

-- ============ DEVICE TOKENS ============
CREATE TABLE IF NOT EXISTS public.device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL,
  platform text NOT NULL DEFAULT 'web',
  topics text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);
CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON public.device_tokens(user_id);
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own device_tokens" ON public.device_tokens
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read device_tokens" ON public.device_tokens
  FOR SELECT TO authenticated
  USING (public.is_admin_user(auth.uid()));
CREATE TRIGGER trg_device_tokens_updated
  BEFORE UPDATE ON public.device_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ USER GEO ============
CREATE TABLE IF NOT EXISTS public.user_geo (
  user_id uuid PRIMARY KEY,
  lat double precision,
  lng double precision,
  accuracy double precision,
  geohash text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_geo_geohash ON public.user_geo(geohash);
ALTER TABLE public.user_geo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own geo" ON public.user_geo
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read user_geo" ON public.user_geo
  FOR SELECT TO authenticated
  USING (public.is_admin_user(auth.uid()));

-- ============ RPCs ============
CREATE OR REPLACE FUNCTION public.admin_upsert_notification_trigger(
  _id uuid, _event_key text, _display_name text,
  _title text, _body text, _image_url text, _action_url text,
  _notification_type text, _channels jsonb, _audience text,
  _is_active boolean, _schedule_at timestamptz
) RETURNS public.notification_triggers
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _row public.notification_triggers;
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF _id IS NULL THEN
    INSERT INTO public.notification_triggers
      (event_key, display_name, title, body, image_url, action_url,
       notification_type, channels, audience, is_active, schedule_at)
    VALUES (_event_key, _display_name, _title, _body, _image_url, _action_url,
       _notification_type, COALESCE(_channels,'{}'::jsonb), _audience, _is_active, _schedule_at)
    RETURNING * INTO _row;
  ELSE
    UPDATE public.notification_triggers SET
      event_key=_event_key, display_name=_display_name,
      title=_title, body=_body, image_url=_image_url, action_url=_action_url,
      notification_type=_notification_type, channels=COALESCE(_channels,channels),
      audience=_audience, is_active=_is_active, schedule_at=_schedule_at,
      updated_at=now()
    WHERE id=_id RETURNING * INTO _row;
  END IF;
  RETURN _row;
END; $$;

CREATE OR REPLACE FUNCTION public.register_device_token(
  _token text, _platform text DEFAULT 'web', _topics text[] DEFAULT '{}'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','auth_required'); END IF;
  INSERT INTO public.device_tokens (user_id, token, platform, topics, is_active, last_seen_at)
  VALUES (_uid, _token, _platform, _topics, true, now())
  ON CONFLICT (user_id, token) DO UPDATE
    SET platform = EXCLUDED.platform,
        topics = EXCLUDED.topics,
        is_active = true,
        last_seen_at = now(),
        updated_at = now();
  RETURN jsonb_build_object('ok', true);
END; $$;

CREATE OR REPLACE FUNCTION public.update_my_geo(
  _lat double precision, _lng double precision, _accuracy double precision DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','auth_required'); END IF;
  INSERT INTO public.user_geo (user_id, lat, lng, accuracy, updated_at)
  VALUES (_uid, _lat, _lng, _accuracy, now())
  ON CONFLICT (user_id) DO UPDATE
    SET lat = EXCLUDED.lat, lng = EXCLUDED.lng,
        accuracy = EXCLUDED.accuracy, updated_at = now();
  RETURN jsonb_build_object('ok', true);
END; $$;

CREATE OR REPLACE FUNCTION public.get_notification_analytics()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _r jsonb;
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT jsonb_build_object(
    'totals', jsonb_build_object(
      'sent',      (SELECT count(*) FROM public.notification_logs WHERE status='sent'),
      'delivered', (SELECT count(*) FROM public.notification_logs WHERE status='delivered'),
      'failed',    (SELECT count(*) FROM public.notification_logs WHERE status='failed'),
      'tokens',    (SELECT count(*) FROM public.device_tokens WHERE is_active = true),
      'triggers',  (SELECT count(*) FROM public.notification_triggers WHERE is_active = true),
      'campaigns', (SELECT count(*) FROM public.notification_campaigns)
    ),
    'recent', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', l.id, 'status', l.status, 'channel', l.channel,
        'provider', l.provider, 'user_id', l.user_id,
        'error', l.error, 'created_at', l.created_at
      ) ORDER BY l.created_at DESC)
      FROM (SELECT * FROM public.notification_logs ORDER BY created_at DESC LIMIT 100) l
    ), '[]'::jsonb),
    'by_day', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('day', d, 'sent', s, 'delivered', dv, 'failed', f) ORDER BY d)
      FROM (
        SELECT date_trunc('day', created_at) AS d,
               count(*) FILTER (WHERE status='sent') AS s,
               count(*) FILTER (WHERE status='delivered') AS dv,
               count(*) FILTER (WHERE status='failed') AS f
          FROM public.notification_logs
         WHERE created_at > now() - interval '14 days'
         GROUP BY 1
      ) t
    ), '[]'::jsonb)
  ) INTO _r;
  RETURN _r;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_test_notification(
  _trigger_id uuid, _user_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _t public.notification_triggers;
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO _t FROM public.notification_triggers WHERE id = _trigger_id;
  IF _t.id IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','not_found'); END IF;
  INSERT INTO public.notification_logs
    (trigger_id, user_id, provider, channel, status, payload)
  VALUES
    (_trigger_id, COALESCE(_user_id, auth.uid()),
     'fcm', 'push', 'sent',
     jsonb_build_object('title', _t.title, 'body', _t.body, 'type', _t.notification_type, 'test', true));
  UPDATE public.notification_triggers SET last_fired_at = now() WHERE id = _trigger_id;
  RETURN jsonb_build_object('ok', true);
END; $$;
