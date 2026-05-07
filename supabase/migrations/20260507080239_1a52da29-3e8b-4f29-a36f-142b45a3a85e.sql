ALTER TABLE public.expense_config
  ADD COLUMN IF NOT EXISTS ytd_starting_miles numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ytd_starting_miles_note text NOT NULL DEFAULT '';