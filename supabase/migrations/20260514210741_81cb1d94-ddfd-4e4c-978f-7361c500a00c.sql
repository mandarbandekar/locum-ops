UPDATE public.invoices i
SET paid_at = ((SELECT MAX(p.payment_date) FROM public.invoice_payments p WHERE p.invoice_id = i.id)::timestamp + interval '12 hours') AT TIME ZONE 'UTC'
WHERE i.paid_at IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.invoice_payments p WHERE p.invoice_id = i.id)
  AND (SELECT MAX(p.payment_date) FROM public.invoice_payments p WHERE p.invoice_id = i.id) <> i.paid_at::date;