CREATE INDEX IF NOT EXISTS idx_shifts_user_untyped
  ON public.shifts (user_id)
  WHERE shift_type IS NULL;