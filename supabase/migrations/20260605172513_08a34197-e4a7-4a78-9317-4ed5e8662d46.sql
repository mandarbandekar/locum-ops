UPDATE public.facilities
SET generates_invoices = false, updated_at = now()
WHERE engagement_type = 'third_party'
  AND generates_invoices = true;