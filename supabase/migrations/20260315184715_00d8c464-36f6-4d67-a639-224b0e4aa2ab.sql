ALTER TABLE public.invoices 
ADD COLUMN billing_email_to text NOT NULL DEFAULT '',
ADD COLUMN billing_email_cc text NOT NULL DEFAULT '',
ADD COLUMN billing_email_bcc text NOT NULL DEFAULT '';