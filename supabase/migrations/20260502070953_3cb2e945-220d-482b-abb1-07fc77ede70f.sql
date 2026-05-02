ALTER TABLE public.tax_intelligence_profiles
  ADD COLUMN IF NOT EXISTS income_projection_method TEXT DEFAULT 'booked_plus_run_rate';

ALTER TABLE public.tax_intelligence_profiles
  DROP CONSTRAINT IF EXISTS income_projection_method_valid;

ALTER TABLE public.tax_intelligence_profiles
  ADD CONSTRAINT income_projection_method_valid
  CHECK (income_projection_method IN ('static', 'run_rate', 'booked_plus_run_rate'));

UPDATE public.tax_intelligence_profiles
  SET income_projection_method = 'booked_plus_run_rate'
  WHERE income_projection_method IS NULL;

COMMENT ON COLUMN public.tax_intelligence_profiles.income_projection_method IS
  'How annual relief income is projected for tax calculation. "static" = use annual_relief_income field directly. "run_rate" = YTD income annualized. "booked_plus_run_rate" = YTD + booked future shifts + run-rate fill for unbooked remaining days. Default is booked_plus_run_rate; falls back to static (annual_relief_income) if no shift data is available.';