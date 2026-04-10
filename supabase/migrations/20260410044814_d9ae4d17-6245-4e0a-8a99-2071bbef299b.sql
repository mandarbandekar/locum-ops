ALTER TABLE public.tax_intelligence_profiles
  ADD COLUMN IF NOT EXISTS annual_relief_income numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extra_withholding numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pay_periods_per_year integer NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS annual_business_expenses numeric NOT NULL DEFAULT 0;