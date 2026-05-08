ALTER TABLE public.facilities
  ADD COLUMN IF NOT EXISTS generates_invoices boolean NOT NULL DEFAULT true;