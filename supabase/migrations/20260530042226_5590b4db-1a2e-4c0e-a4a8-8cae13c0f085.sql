-- Phase D: Lock in zero-drift invariant on shifts.timezone_at_creation

-- 1. Backfill any null/empty snapshots from the facility timezone
UPDATE public.shifts s
SET timezone_at_creation = f.timezone
FROM public.facilities f
WHERE s.facility_id = f.id
  AND (s.timezone_at_creation IS NULL OR trim(s.timezone_at_creation) = '');

-- 2. BEFORE INSERT trigger: auto-fill snapshot from facility tz only when missing.
--    Never override a client-provided value (preserves the traveling-vet override case).
CREATE OR REPLACE FUNCTION public.ensure_shift_timezone_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.timezone_at_creation IS NULL
     OR trim(NEW.timezone_at_creation) = '' THEN
    NEW.timezone_at_creation :=
      (SELECT timezone FROM public.facilities WHERE id = NEW.facility_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS shifts_ensure_timezone_snapshot ON public.shifts;
CREATE TRIGGER shifts_ensure_timezone_snapshot
BEFORE INSERT ON public.shifts
FOR EACH ROW
EXECUTE FUNCTION public.ensure_shift_timezone_snapshot();

-- 3. Enforce non-null after backfill + trigger are in place
ALTER TABLE public.shifts
  ALTER COLUMN timezone_at_creation SET NOT NULL;