
-- Create a separate secure table for credential renewal portal info
CREATE TABLE public.credential_renewal_portals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id uuid NOT NULL REFERENCES public.credentials(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  renewal_website_url text,
  renewal_username text,
  renewal_password_encrypted text,
  renewal_portal_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(credential_id)
);

ALTER TABLE public.credential_renewal_portals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own renewal portals"
  ON public.credential_renewal_portals
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
