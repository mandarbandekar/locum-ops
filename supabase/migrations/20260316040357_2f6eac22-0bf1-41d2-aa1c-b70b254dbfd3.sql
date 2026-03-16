ALTER TABLE public.facilities
  ADD COLUMN invoice_name_to text NOT NULL DEFAULT '',
  ADD COLUMN invoice_name_cc text NOT NULL DEFAULT '',
  ADD COLUMN invoice_name_bcc text NOT NULL DEFAULT '';