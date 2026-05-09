UPDATE public.sms_gateways
SET config = jsonb_set(
              jsonb_set(
                jsonb_set(
                  COALESCE(config, '{}'::jsonb),
                  '{message_id}', '"170756"', true),
                '{template_id}', '"170756"', true),
              '{templates}',
              '[{"event":"otp","label":"OTP Login (Doorshope sample)","template_id":"170756","variables":"#VAR#"}]'::jsonb,
              true),
    is_active = true,
    is_test_mode = false,
    updated_at = now()
WHERE provider = 'fast2sms';