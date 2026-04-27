ALTER TABLE public.facilities
  ADD COLUMN default_break_minutes integer NULL;

ALTER TABLE public.shifts
  ADD COLUMN break_minutes integer NULL,
  ADD COLUMN worked_through_break boolean NOT NULL DEFAULT false;

ALTER TABLE public.facilities
  ADD CONSTRAINT facilities_default_break_minutes_range
  CHECK (default_break_minutes IS NULL OR (default_break_minutes >= 0 AND default_break_minutes <= 240));

ALTER TABLE public.shifts
  ADD CONSTRAINT shifts_break_minutes_range
  CHECK (break_minutes IS NULL OR (break_minutes >= 0 AND break_minutes <= 240));