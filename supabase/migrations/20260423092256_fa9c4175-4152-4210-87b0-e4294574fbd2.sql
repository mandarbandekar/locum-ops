ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS onboarding_progress jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.user_profiles.onboarding_progress IS
'Resumable onboarding state: { phase, first_facility_id, created_facility_ids, session_shift_ids, invoice_reveal_seen, business_map_seen, updated_at }';