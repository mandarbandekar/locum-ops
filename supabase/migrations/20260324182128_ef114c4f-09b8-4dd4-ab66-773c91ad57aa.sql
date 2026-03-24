CREATE TABLE public.account_deletion_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL DEFAULT '',
  reason text NOT NULL DEFAULT '',
  feedback text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.account_deletion_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage deletion logs"
ON public.account_deletion_logs
FOR ALL
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');