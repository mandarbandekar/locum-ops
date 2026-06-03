ALTER TABLE public.invoices
  ADD COLUMN sender_company_override text,
  ADD COLUMN sender_name_override text,
  ADD COLUMN sender_address_override text,
  ADD COLUMN sender_email_override text,
  ADD COLUMN sender_phone_override text,
  ADD COLUMN billto_facility_name_override text,
  ADD COLUMN billto_contact_name_override text,
  ADD COLUMN billto_email_override text,
  ADD COLUMN billto_address_override text;