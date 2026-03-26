
-- Add billing cadence fields to facilities
ALTER TABLE public.facilities
  ADD COLUMN IF NOT EXISTS billing_cadence text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS billing_cycle_anchor_date date,
  ADD COLUMN IF NOT EXISTS billing_week_end_day text NOT NULL DEFAULT 'saturday',
  ADD COLUMN IF NOT EXISTS auto_generate_invoices boolean NOT NULL DEFAULT true;

-- Add generation metadata to invoices
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS generation_type text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS billing_cadence text;
