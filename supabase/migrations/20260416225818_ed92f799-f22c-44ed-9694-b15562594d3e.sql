UPDATE public.invoices SET status = 'sent' WHERE status = 'overdue';

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('draft','sent','partial','paid'));