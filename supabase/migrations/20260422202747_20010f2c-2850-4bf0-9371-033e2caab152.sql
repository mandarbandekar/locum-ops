ALTER TABLE public.terms_snapshots
  ADD COLUMN IF NOT EXISTS rate_kinds jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS rate_kind text NOT NULL DEFAULT 'flat',
  ADD COLUMN IF NOT EXISTS hourly_rate numeric;