
CREATE TABLE IF NOT EXISTS public.user_sign_in_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  device_type text NOT NULL DEFAULT 'unknown',
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_sign_in_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own sign-in events"
  ON public.user_sign_in_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own sign-in events"
  ON public.user_sign_in_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_sign_in_events_user_created
  ON public.user_sign_in_events (user_id, created_at DESC);
