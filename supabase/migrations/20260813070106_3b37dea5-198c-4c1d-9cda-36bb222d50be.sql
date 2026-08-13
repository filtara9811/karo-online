CREATE TABLE IF NOT EXISTS public.shop_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_user_id uuid NOT NULL,
  code text NOT NULL,
  visitor_token text NOT NULL,
  visitor_name text,
  visitor_phone text,
  product_id text,
  product_name text,
  product_image text,
  product_price text,
  kind text NOT NULL DEFAULT 'inquiry' CHECK (kind IN ('inquiry','order')),
  quantity integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'open',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shop_threads_merchant_idx ON public.shop_threads (merchant_user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS shop_threads_token_idx ON public.shop_threads (visitor_token, last_message_at DESC);

CREATE TABLE IF NOT EXISTS public.shop_thread_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.shop_threads(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('shopper','merchant')),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shop_thread_messages_thread_idx ON public.shop_thread_messages (thread_id, created_at);

GRANT SELECT, UPDATE ON public.shop_threads TO authenticated;
GRANT ALL ON public.shop_threads TO service_role;
GRANT SELECT, INSERT ON public.shop_thread_messages TO authenticated;
GRANT ALL ON public.shop_thread_messages TO service_role;

ALTER TABLE public.shop_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_thread_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "merchant reads own shop threads" ON public.shop_threads
  FOR SELECT TO authenticated USING (merchant_user_id = auth.uid());
CREATE POLICY "merchant updates own shop threads" ON public.shop_threads
  FOR UPDATE TO authenticated USING (merchant_user_id = auth.uid()) WITH CHECK (merchant_user_id = auth.uid());

CREATE POLICY "merchant reads own thread messages" ON public.shop_thread_messages
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.shop_threads t WHERE t.id = thread_id AND t.merchant_user_id = auth.uid())
  );
CREATE POLICY "merchant writes own thread messages" ON public.shop_thread_messages
  FOR INSERT TO authenticated WITH CHECK (
    sender = 'merchant'
    AND EXISTS (SELECT 1 FROM public.shop_threads t WHERE t.id = thread_id AND t.merchant_user_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.resolve_merchant_by_code(_code text)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid;
BEGIN
  SELECT user_id INTO _uid FROM public.referral_codes WHERE upper(code) = upper(trim(_code)) LIMIT 1;
  IF _uid IS NULL THEN
    SELECT id INTO _uid FROM public.customers WHERE upper(referral_code) = upper(trim(_code)) LIMIT 1;
  END IF;
  RETURN _uid;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_landing_contact(_code text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid; _c record;
BEGIN
  _uid := public.resolve_merchant_by_code(_code);
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false); END IF;
  SELECT phone, email INTO _c FROM public.customers WHERE id = _uid LIMIT 1;
  RETURN jsonb_build_object('ok', true, 'phone', _c.phone, 'email', _c.email);
END;
$$;

CREATE OR REPLACE FUNCTION public.shop_thread_start(
  _code text, _token text, _name text, _phone text,
  _product jsonb, _kind text, _quantity integer, _message text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid; _thread uuid;
BEGIN
  IF _token IS NULL OR length(trim(_token)) < 8 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'bad_token');
  END IF;
  _uid := public.resolve_merchant_by_code(_code);
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'unknown_shop'); END IF;

  INSERT INTO public.shop_threads (
    merchant_user_id, code, visitor_token, visitor_name, visitor_phone,
    product_id, product_name, product_image, product_price,
    kind, quantity
  ) VALUES (
    _uid, upper(trim(_code)), trim(_token), NULLIF(trim(COALESCE(_name,'')),''), NULLIF(regexp_replace(COALESCE(_phone,''), '\D', '', 'g'),''),
    NULLIF(_product->>'id',''), NULLIF(_product->>'name',''), NULLIF(_product->>'image',''), NULLIF(_product->>'price',''),
    CASE WHEN _kind = 'order' THEN 'order' ELSE 'inquiry' END,
    GREATEST(COALESCE(_quantity, 1), 1)
  ) RETURNING id INTO _thread;

  IF _message IS NOT NULL AND length(trim(_message)) > 0 THEN
    INSERT INTO public.shop_thread_messages (thread_id, sender, body)
    VALUES (_thread, 'shopper', left(trim(_message), 2000));
  END IF;

  RETURN jsonb_build_object('ok', true, 'thread_id', _thread);
END;
$$;

CREATE OR REPLACE FUNCTION public.shop_thread_send(_thread uuid, _token text, _body text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _ok boolean;
BEGIN
  IF _body IS NULL OR length(trim(_body)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'empty');
  END IF;
  SELECT true INTO _ok FROM public.shop_threads
   WHERE id = _thread AND visitor_token = trim(COALESCE(_token,'')) LIMIT 1;
  IF NOT COALESCE(_ok, false) THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;

  INSERT INTO public.shop_thread_messages (thread_id, sender, body)
  VALUES (_thread, 'shopper', left(trim(_body), 2000));
  UPDATE public.shop_threads SET last_message_at = now() WHERE id = _thread;
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.shop_thread_list(_code text, _token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _out jsonb;
BEGIN
  IF _token IS NULL OR length(trim(_token)) < 8 THEN RETURN '[]'::jsonb; END IF;
  SELECT COALESCE(jsonb_agg(t ORDER BY t.last_message_at DESC), '[]'::jsonb) INTO _out
  FROM (
    SELECT jsonb_build_object(
      'id', s.id, 'kind', s.kind, 'status', s.status, 'quantity', s.quantity,
      'product_name', s.product_name, 'product_image', s.product_image, 'product_price', s.product_price,
      'created_at', s.created_at, 'last_message_at', s.last_message_at,
      'last_body', (SELECT m.body FROM public.shop_thread_messages m WHERE m.thread_id = s.id ORDER BY m.created_at DESC LIMIT 1)
    ) AS t, s.last_message_at
    FROM public.shop_threads s
    WHERE s.visitor_token = trim(_token)
      AND (_code IS NULL OR upper(s.code) = upper(trim(_code)))
    ORDER BY s.last_message_at DESC
    LIMIT 50
  ) t;
  RETURN _out;
END;
$$;

CREATE OR REPLACE FUNCTION public.shop_thread_messages_for_visitor(_thread uuid, _token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _ok boolean; _out jsonb;
BEGIN
  SELECT true INTO _ok FROM public.shop_threads
   WHERE id = _thread AND visitor_token = trim(COALESCE(_token,'')) LIMIT 1;
  IF NOT COALESCE(_ok, false) THEN RETURN '[]'::jsonb; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', m.id, 'sender', m.sender, 'body', m.body, 'created_at', m.created_at
  ) ORDER BY m.created_at), '[]'::jsonb) INTO _out
  FROM public.shop_thread_messages m WHERE m.thread_id = _thread;
  RETURN _out;
END;
$$;

CREATE OR REPLACE FUNCTION public.shop_thread_update_visitor(_token text, _name text, _phone text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _token IS NULL OR length(trim(_token)) < 8 THEN RETURN jsonb_build_object('ok', false); END IF;
  UPDATE public.shop_threads
     SET visitor_name = COALESCE(NULLIF(trim(COALESCE(_name,'')),''), visitor_name),
         visitor_phone = COALESCE(NULLIF(regexp_replace(COALESCE(_phone,''), '\D', '', 'g'),''), visitor_phone)
   WHERE visitor_token = trim(_token);
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.shop_thread_reply(_thread uuid, _body text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _ok boolean;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'auth'); END IF;
  IF _body IS NULL OR length(trim(_body)) = 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'empty'); END IF;
  SELECT true INTO _ok FROM public.shop_threads WHERE id = _thread AND merchant_user_id = auth.uid() LIMIT 1;
  IF NOT COALESCE(_ok, false) THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  INSERT INTO public.shop_thread_messages (thread_id, sender, body) VALUES (_thread, 'merchant', left(trim(_body), 2000));
  UPDATE public.shop_threads SET last_message_at = now() WHERE id = _thread;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_merchant_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_landing_contact(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.shop_thread_start(text, text, text, text, jsonb, text, integer, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.shop_thread_send(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.shop_thread_list(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.shop_thread_messages_for_visitor(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.shop_thread_update_visitor(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.shop_thread_reply(uuid, text) TO authenticated;