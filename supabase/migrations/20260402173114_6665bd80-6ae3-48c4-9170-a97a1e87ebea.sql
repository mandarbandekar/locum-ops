ALTER TABLE public.tax_settings
ADD COLUMN filing_status text NOT NULL DEFAULT 'single',
ADD COLUMN estimated_deductions numeric NOT NULL DEFAULT 0;