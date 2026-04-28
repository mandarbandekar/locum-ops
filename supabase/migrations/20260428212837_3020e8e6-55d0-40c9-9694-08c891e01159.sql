ALTER TABLE public.terms_snapshots
ADD COLUMN IF NOT EXISTS rate_shift_types jsonb NOT NULL DEFAULT '{}'::jsonb;