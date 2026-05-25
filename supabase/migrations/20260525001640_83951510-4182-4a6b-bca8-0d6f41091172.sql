
-- Phase 1: facilities.timezone hardening
UPDATE public.facilities f
SET timezone = COALESCE(
  NULLIF(f.timezone, ''),
  (SELECT NULLIF(up.timezone, '') FROM public.user_profiles up WHERE up.user_id = f.user_id LIMIT 1),
  'America/New_York'
)
WHERE f.timezone IS NULL OR f.timezone = '';

ALTER TABLE public.facilities
  ALTER COLUMN timezone SET DEFAULT 'America/New_York',
  ALTER COLUMN timezone SET NOT NULL;

-- Phase 2: shifts.timezone_at_creation snapshot
ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS timezone_at_creation text;

UPDATE public.shifts s
SET timezone_at_creation = f.timezone
FROM public.facilities f
WHERE s.facility_id = f.id
  AND (s.timezone_at_creation IS NULL OR s.timezone_at_creation = '');
