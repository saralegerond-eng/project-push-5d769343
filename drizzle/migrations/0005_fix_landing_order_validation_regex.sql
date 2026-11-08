CREATE OR REPLACE FUNCTION public.is_valid_landing_page_order(
  _first_name text,
  _last_name text,
  _phone text,
  _city text,
  _full_address text,
  _product_name text,
  _product_price numeric,
  _quantity integer,
  _total_amount numeric,
  _delivery_fee numeric,
  _status public.order_status,
  _admin_notes text,
  _source text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    char_length(_first_name) BETWEEN 2 AND 100
    AND char_length(_last_name) BETWEEN 2 AND 100
    AND _phone ~ '^[0-9+(). -]+$'
    AND char_length(_phone) BETWEEN 9 AND 20
    AND char_length(_city) BETWEEN 2 AND 100
    AND char_length(_full_address) BETWEEN 8 AND 500
    AND _product_name = 'Premier Nasal Dilator – Starter Kit'
    AND _product_price = 199
    AND _quantity BETWEEN 1 AND 10
    AND _total_amount = _product_price * _quantity
    AND _delivery_fee = 0
    AND _status = 'new'::public.order_status
    AND _admin_notes = ''
    AND _source = 'landing-page';
$$;