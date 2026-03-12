
CREATE TABLE public.waitlist_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  persona text NOT NULL DEFAULT '',
  source_page text NOT NULL DEFAULT 'landing_page',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.waitlist_leads ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (public waitlist form)
CREATE POLICY "Anyone can insert waitlist leads"
  ON public.waitlist_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
