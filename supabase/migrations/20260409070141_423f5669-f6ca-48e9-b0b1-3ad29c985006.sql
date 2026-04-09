
CREATE TABLE public.tax_strategy_inputs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  deduction_checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  home_office_sqft integer NOT NULL DEFAULT 0,
  weekly_business_miles numeric NOT NULL DEFAULT 0,
  retirement_vehicle text NOT NULL DEFAULT 'sep_ira',
  retirement_contribution_slider numeric NOT NULL DEFAULT 0,
  scorp_salary_slider numeric NOT NULL DEFAULT 110000,
  prior_year_tax numeric NOT NULL DEFAULT 0,
  dismissed_strategies text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tax_strategy_inputs ADD CONSTRAINT tax_strategy_inputs_user_id_unique UNIQUE (user_id);

ALTER TABLE public.tax_strategy_inputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own tax strategy inputs"
ON public.tax_strategy_inputs
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_tax_strategy_inputs_updated_at
BEFORE UPDATE ON public.tax_strategy_inputs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
