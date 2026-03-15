ALTER TABLE public.facilities
  ADD COLUMN invoice_email_to text NOT NULL DEFAULT '',
  ADD COLUMN invoice_email_cc text NOT NULL DEFAULT '',
  ADD COLUMN invoice_email_bcc text NOT NULL DEFAULT '';