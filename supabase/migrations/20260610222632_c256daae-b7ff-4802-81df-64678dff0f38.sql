-- Drop duplicate UPDATE policy on expense-receipts (keep "Users can update own expense receipts")
DROP POLICY IF EXISTS "Users can update own receipts" ON storage.objects;

-- Document oauth_state_tokens as service-role only
COMMENT ON TABLE public.oauth_state_tokens IS 'Service-role only. Accessed exclusively by edge functions (google-calendar-auth) using SUPABASE_SERVICE_ROLE_KEY. RLS enabled with no policies intentionally denies all anon/authenticated access.';