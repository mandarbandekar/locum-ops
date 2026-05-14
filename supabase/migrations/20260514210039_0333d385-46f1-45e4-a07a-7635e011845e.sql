UPDATE public.invoices i
SET paid_at = ((SELECT MAX(p.payment_date) FROM public.invoice_payments p WHERE p.invoice_id = i.id)::timestamp + interval '12 hours') AT TIME ZONE 'UTC'
WHERE i.user_id = '775f29fb-9907-4eb4-8737-2703c13094ba'
  AND i.paid_at IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.invoice_payments p WHERE p.invoice_id = i.id);