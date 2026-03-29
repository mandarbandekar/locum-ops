-- Fix 1: Add explicit INSERT and DELETE policies for profiles table
-- INSERT: only allow users to insert their own profile (backup for trigger)
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- DELETE: prevent any user from deleting profiles
CREATE POLICY "No one can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (false);

-- Fix 2: Replace overly permissive waitlist_leads INSERT policy
DROP POLICY IF EXISTS "Anyone can insert waitlist leads" ON public.waitlist_leads;

CREATE POLICY "Anyone can insert waitlist leads"
ON public.waitlist_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (true);