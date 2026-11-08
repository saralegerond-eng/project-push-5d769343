DROP POLICY "Anyone can submit a validated order" ON public.orders;

CREATE POLICY "Anyone can submit a validated order"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (
  status = 'new'
  AND delivery_fee = 0
  AND admin_notes = ''
  AND product_price = 199
  AND total_amount = product_price * quantity
  AND product_name = 'Premier Nasal Dilator – Starter Kit'
  AND source = 'landing-page'
  AND created_at IS NOT NULL
  AND updated_at IS NOT NULL
);