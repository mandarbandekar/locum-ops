CREATE POLICY "Only service role can read waitlist leads"
ON public.waitlist_leads
FOR SELECT
TO public
USING (auth.role() = 'service_role'::text);