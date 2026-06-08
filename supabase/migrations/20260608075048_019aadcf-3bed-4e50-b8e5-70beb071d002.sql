
-- 1. OAuth state nonces (server-stored CSRF binding for OAuth flows)
CREATE TABLE IF NOT EXISTS public.oauth_state_tokens (
  nonce uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  provider text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  consumed_at timestamptz
);

GRANT ALL ON public.oauth_state_tokens TO service_role;

ALTER TABLE public.oauth_state_tokens ENABLE ROW LEVEL SECURITY;

-- No policies: only service_role (which bypasses RLS) may access. authenticated/anon are denied by default.

CREATE INDEX IF NOT EXISTS oauth_state_tokens_expires_at_idx
  ON public.oauth_state_tokens (expires_at);

-- 2. Feedback submissions: block users from setting internal/admin-only columns
CREATE OR REPLACE FUNCTION public.enforce_feedback_user_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_feedback_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Force internal fields to safe defaults regardless of client input.
    NEW.status := 'new';
    NEW.priority := 'normal';
    NEW.internal_notes := NULL;
    NEW.resolved_at := NULL;
    NEW.resolved_by := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Non-admins cannot change internal fields.
    NEW.status := OLD.status;
    NEW.priority := OLD.priority;
    NEW.internal_notes := OLD.internal_notes;
    NEW.resolved_at := OLD.resolved_at;
    NEW.resolved_by := OLD.resolved_by;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_feedback_user_columns ON public.feedback_submissions;
CREATE TRIGGER trg_enforce_feedback_user_columns
BEFORE INSERT OR UPDATE ON public.feedback_submissions
FOR EACH ROW EXECUTE FUNCTION public.enforce_feedback_user_columns();
