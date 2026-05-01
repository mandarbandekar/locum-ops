-- 1. Backfill: roll end_datetime forward 24h until it's after start_datetime.
-- Loop covers both same-day (-12h) and prior-day (-36h) cases.
DO $$
BEGIN
  LOOP
    UPDATE public.shifts
    SET end_datetime = end_datetime + interval '1 day'
    WHERE end_datetime <= start_datetime;
    EXIT WHEN NOT FOUND;
  END LOOP;
END $$;

-- 2. Validation trigger to prevent future bad inserts/updates.
CREATE OR REPLACE FUNCTION public.validate_shift_times()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.end_datetime <= NEW.start_datetime THEN
    RAISE EXCEPTION 'Shift end_datetime (%) must be after start_datetime (%). For overnight shifts, end_datetime should roll to the next day.',
      NEW.end_datetime, NEW.start_datetime
      USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_shift_times_trigger ON public.shifts;
CREATE TRIGGER validate_shift_times_trigger
  BEFORE INSERT OR UPDATE OF start_datetime, end_datetime ON public.shifts
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_shift_times();