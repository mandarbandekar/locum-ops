ALTER TABLE public.tax_intelligence_profiles
  ADD COLUMN IF NOT EXISTS prior_year_agi NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS q1_estimated_payment NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS q2_estimated_payment NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS q3_estimated_payment NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS q4_estimated_payment NUMERIC DEFAULT 0;

COMMENT ON COLUMN public.tax_intelligence_profiles.prior_year_agi IS
  'Adjusted Gross Income from last year (Form 1040 line 11). Used to determine 110% safe harbor threshold above $150K.';
COMMENT ON COLUMN public.tax_intelligence_profiles.q1_estimated_payment IS
  'Federal estimated tax payment made for Q1 of current year. Default 0.';
COMMENT ON COLUMN public.tax_intelligence_profiles.q2_estimated_payment IS
  'Federal estimated tax payment made for Q2 of current year. Default 0.';
COMMENT ON COLUMN public.tax_intelligence_profiles.q3_estimated_payment IS
  'Federal estimated tax payment made for Q3 of current year. Default 0.';
COMMENT ON COLUMN public.tax_intelligence_profiles.q4_estimated_payment IS
  'Federal estimated tax payment made for Q4 of current year. Default 0.';