ALTER TABLE public.tax_intelligence_profiles
  ADD COLUMN IF NOT EXISTS projection_method text NOT NULL DEFAULT 'annualized_actual',
  ADD COLUMN IF NOT EXISTS annual_income_goal numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prior_year_total_income numeric NOT NULL DEFAULT 0;