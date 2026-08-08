CREATE OR REPLACE FUNCTION public.get_public_landing(_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _out jsonb;
  _style text;
  _key text;
BEGIN
  _out := public.get_public_landing_v1(_code);
  _key := _out #>> '{theme,key}';
  SELECT style INTO _style FROM public.qr_landing_themes WHERE key = _key LIMIT 1;
  RETURN jsonb_set(_out, '{theme,style}', to_jsonb(COALESCE(_style, 'shop')));
END;
$function$;