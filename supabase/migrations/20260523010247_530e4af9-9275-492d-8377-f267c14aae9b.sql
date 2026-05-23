
-- Trigger function — never needs to be called directly.
REVOKE EXECUTE ON FUNCTION public.validate_shift_times() FROM anon, authenticated, public;

-- Convert the shift engagement helper to SECURITY INVOKER so RLS applies; it
-- only reads shifts/facilities which already have user-scoped RLS.
ALTER FUNCTION public.get_shift_effective_engagement(uuid) SECURITY INVOKER;
REVOKE EXECUTE ON FUNCTION public.get_shift_effective_engagement(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_shift_effective_engagement(uuid) TO authenticated;

-- is_feedback_admin is used inside RLS policies; keep it callable but restrict anon.
REVOKE EXECUTE ON FUNCTION public.is_feedback_admin() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_feedback_admin() TO authenticated;

-- get_founder_overview already has an in-function admin check, but lock it to authenticated only.
REVOKE EXECUTE ON FUNCTION public.get_founder_overview() FROM public;
GRANT EXECUTE ON FUNCTION public.get_founder_overview() TO authenticated;
