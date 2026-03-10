
-- Tax profiles for strategy module
CREATE TABLE public.tax_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  current_entity_type text NOT NULL DEFAULT 'sole_proprietor',
  projected_annual_profit numeric,
  stable_income boolean,
  payroll_active boolean,
  admin_complexity_ok boolean,
  retirement_interest boolean,
  income_up_this_year boolean,
  multi_facility_work boolean,
  relief_income_major_source boolean,
  reserve_percent numeric DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.tax_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own tax profiles"
ON public.tax_profiles FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Deduction categories
CREATE TABLE public.deduction_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  ytd_amount numeric NOT NULL DEFAULT 0,
  documentation_status text NOT NULL DEFAULT 'needs_review',
  receipt_completeness_percent integer NOT NULL DEFAULT 0,
  missing_docs_count integer NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deduction_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own deduction categories"
ON public.deduction_categories FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Tax checklist items
CREATE TABLE public.tax_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  item_key text NOT NULL,
  label text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_key)
);

ALTER TABLE public.tax_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own tax checklist items"
ON public.tax_checklist_items FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- CPA questions
CREATE TABLE public.cpa_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  question text NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cpa_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own CPA questions"
ON public.cpa_questions FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_tax_profiles_updated_at BEFORE UPDATE ON public.tax_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_deduction_categories_updated_at BEFORE UPDATE ON public.deduction_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_tax_checklist_items_updated_at BEFORE UPDATE ON public.tax_checklist_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_cpa_questions_updated_at BEFORE UPDATE ON public.cpa_questions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
