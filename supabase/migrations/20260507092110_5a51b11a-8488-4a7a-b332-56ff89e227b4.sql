ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS overtime_hours numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overtime_rate  numeric NOT NULL DEFAULT 0;