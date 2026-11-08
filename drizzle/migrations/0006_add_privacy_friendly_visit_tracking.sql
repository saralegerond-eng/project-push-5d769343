CREATE TABLE public.site_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  session_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid()
);

GRANT INSERT ON public.site_visits TO anon, authenticated;
GRANT SELECT ON public.site_visits TO authenticated;
GRANT ALL ON public.site_visits TO service_role;

ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record one anonymous site visit"
  ON public.site_visits
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read aggregate visit records"
  ON public.site_visits
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX site_visits_visit_date_idx ON public.site_visits (visit_date);