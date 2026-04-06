
ALTER TABLE public.expenses
  ADD COLUMN recurrence_type text NOT NULL DEFAULT 'none',
  ADD COLUMN recurrence_parent_id uuid REFERENCES public.expenses(id) ON DELETE SET NULL,
  ADD COLUMN recurrence_end_date date;

CREATE INDEX idx_expenses_recurrence_parent ON public.expenses(recurrence_parent_id) WHERE recurrence_parent_id IS NOT NULL;
CREATE INDEX idx_expenses_recurrence_type ON public.expenses(recurrence_type) WHERE recurrence_type != 'none';
