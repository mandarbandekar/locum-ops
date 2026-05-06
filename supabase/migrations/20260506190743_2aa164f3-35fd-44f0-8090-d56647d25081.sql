-- Normalize shifts.status to a neutral 'active' default so legacy
-- 'proposed'/'booked' values can no longer cause invoice generation
-- (or any other status-based filter) to silently skip rows.
-- Per product model, shifts have no lifecycle status; cancellation = delete.

ALTER TABLE public.shifts ALTER COLUMN status SET DEFAULT 'active';

UPDATE public.shifts
SET status = 'active'
WHERE status IS DISTINCT FROM 'active';