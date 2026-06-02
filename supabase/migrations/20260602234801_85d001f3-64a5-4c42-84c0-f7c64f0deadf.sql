-- Add date-based suppression key so timezone changes don't desync comparisons.
ALTER TABLE public.suppressed_invoice_periods
  ADD COLUMN IF NOT EXISTS period_start_date date,
  ADD COLUMN IF NOT EXISTS period_end_date date;

-- Backfill from the existing timestamptz bounds using each facility's current timezone.
UPDATE public.suppressed_invoice_periods sip
SET
  period_start_date = (sip.period_start AT TIME ZONE COALESCE(NULLIF(trim(f.timezone), ''), 'America/New_York'))::date,
  period_end_date   = (sip.period_end   AT TIME ZONE COALESCE(NULLIF(trim(f.timezone), ''), 'America/New_York'))::date
FROM public.facilities f
WHERE f.id = sip.facility_id
  AND (sip.period_start_date IS NULL OR sip.period_end_date IS NULL);

-- After backfill, lock them in as required.
ALTER TABLE public.suppressed_invoice_periods
  ALTER COLUMN period_start_date SET NOT NULL,
  ALTER COLUMN period_end_date   SET NOT NULL;

-- Helpful index for the lookup the cron and client do.
CREATE INDEX IF NOT EXISTS idx_suppressed_invoice_periods_facility_dates
  ON public.suppressed_invoice_periods (facility_id, period_start_date, period_end_date);