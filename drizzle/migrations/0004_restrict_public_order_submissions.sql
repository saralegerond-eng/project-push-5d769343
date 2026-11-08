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
    _first_name ~ '^.{2,100}$'
    AND _last_name ~ '^.{2,100}$'
    AND _phone ~ '^[0-9+(). -]{9,20}$'
    AND _city ~ '^.{2,100}$'
    AND _full_address ~ '^.{8,500}$'
    AND _product_name = 'Premier Nasal Dilator – Starter Kit'
    AND _product_price = 199
    AND _quantity BETWEEN 1 AND 10
    AND _total_amount = _product_price * _quantity
    AND _delivery_fee = 0
    AND _status = 'new'::public.order_status
    AND _admin_notes = ''
    AND _source = 'landing-page';
$$;

DROP POLICY "Anyone can submit a landing-page order" ON public.orders;

CREATE POLICY "Validated landing-page orders can be submitted"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (
  public.is_valid_landing_page_order(
    first_name,
    last_name,
    phone,
    city,
    full_address,
    product_name,
    product_price,
    quantity,
    total_amount,
    delivery_fee,
    status,
    admin_notes,
    source
  )
);