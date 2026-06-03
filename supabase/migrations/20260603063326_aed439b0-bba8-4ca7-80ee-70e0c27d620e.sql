-- Backfill: auto-invoice draft lines for flat-rate shifts were inserted with
-- line_kind='regular' (DB default) by the generate-auto-invoices edge function,
-- causing the UI to render them as "Hourly · $X/hr". Correct them to 'flat'.
-- Only touch unedited draft lines so user customizations are preserved.
UPDATE public.invoice_line_items li
SET line_kind = 'flat'
FROM public.shifts s, public.invoices i
WHERE li.shift_id = s.id
  AND li.invoice_id = i.id
  AND li.line_kind = 'regular'
  AND s.rate_kind = 'flat'
  AND i.status = 'draft'
  AND li.user_edited_at IS NULL;
