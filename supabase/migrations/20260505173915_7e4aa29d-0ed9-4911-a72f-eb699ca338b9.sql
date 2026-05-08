-- Function to check if a customer with given phone already exists, and return basic profile
CREATE OR REPLACE FUNCTION public.lookup_customer_by_phone(_phone text)
RETURNS TABLE (
  exists_flag boolean,
  name text,
  gender text,
  email text,
  address text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    TRUE as exists_flag,
    c.name,
    c.gender,
    c.email,
    c.address
  FROM public.customers c
  WHERE c.phone = _phone
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.lookup_customer_by_phone(text) TO anon, authenticated;