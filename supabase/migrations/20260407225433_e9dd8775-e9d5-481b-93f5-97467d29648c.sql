
CREATE TABLE public.tax_intelligence_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  entity_type text NOT NULL DEFAULT 'sole_prop',
  filing_status text NOT NULL DEFAULT 'single',
  state_code text NOT NULL DEFAULT '',
  other_w2_income numeric NOT NULL DEFAULT 0,
  retirement_type text NOT NULL DEFAULT 'none',
  retirement_contribution numeric NOT NULL DEFAULT 0,
  expense_tracking_level text NOT NULL DEFAULT 'none',
  ytd_expenses_estimate numeric NOT NULL DEFAULT 0,
  scorp_salary numeric NOT NULL DEFAULT 0,
  safe_harbor_method text NOT NULL DEFAULT '90_percent',
  prior_year_tax_paid numeric NOT NULL DEFAULT 0,
  setup_completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tax_intelligence_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own tax intelligence profiles"
  ON public.tax_intelligence_profiles
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE UNIQUE INDEX idx_tax_intelligence_profiles_user ON public.tax_intelligence_profiles (user_id);

CREATE TRIGGER update_tax_intelligence_profiles_updated_at
  BEFORE UPDATE ON public.tax_intelligence_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
