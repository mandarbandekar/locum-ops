
-- 1) Revoke EXECUTE on internal SECURITY DEFINER functions from anon/authenticated.
--    These are called by edge functions (service_role) or by triggers — never by clients.
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_profile() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_founder_overview() FROM anon;

-- Tighten the auth.uid()-scoped invoice number helper: should only be callable
-- by signed-in users, never anon.
REVOKE EXECUTE ON FUNCTION public.next_invoice_number(text, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.next_invoice_number(text, integer) TO authenticated;

-- The service-role variant is only for edge functions; remove any public/anon/auth access.
REVOKE EXECUTE ON FUNCTION public.next_invoice_number_for_user(uuid, text, integer) FROM anon, authenticated, public;

-- owns_* helpers are only used inside RLS policies (the policy runs as the
-- definer of those policies). Revoke direct client EXECUTE.
REVOKE EXECUTE ON FUNCTION public.owns_ce_entry(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.owns_confirmation(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.owns_credential(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.owns_document(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.owns_packet(uuid, uuid) FROM anon, public;

-- 2) Replace overly-permissive waitlist INSERT policy (`WITH CHECK (true)`)
--    with one that enforces minimal field validation and restricts to anon/authenticated roles.
DROP POLICY IF EXISTS "Anyone can insert waitlist leads" ON public.waitlist_leads;
CREATE POLICY "Anyone can insert waitlist leads"
  ON public.waitlist_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL
    AND length(email) BETWEEN 3 AND 320
    AND email LIKE '%_@_%.__%'
  );

-- 3) Prevent users from submitting feedback under another user's email.
--    Enforce that user_email matches the auth user's verified email at insert/update time.
CREATE OR REPLACE FUNCTION public.enforce_feedback_user_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_email text;
BEGIN
  _caller_email := lower(coalesce(auth.email(), ''));
  IF _caller_email = '' THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  -- Always overwrite user_email with the caller's verified email; ignore any client value.
  NEW.user_email := _caller_email;
  NEW.user_id := COALESCE(NEW.user_id, auth.uid());
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.enforce_feedback_user_email() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS trg_enforce_feedback_user_email ON public.feedback_submissions;
CREATE TRIGGER trg_enforce_feedback_user_email
  BEFORE INSERT OR UPDATE ON public.feedback_submissions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_feedback_user_email();
