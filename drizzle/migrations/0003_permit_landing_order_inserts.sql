DROP POLICY "Anyone can submit a validated order" ON public.orders;

CREATE POLICY "Anyone can submit a landing-page order"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (true);