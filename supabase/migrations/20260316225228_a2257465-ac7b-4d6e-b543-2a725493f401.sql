
-- Tax Advisor Profiles (intake form)
CREATE TABLE public.tax_advisor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  entity_type text NOT NULL DEFAULT 'sole_proprietor',
  travels_for_ce boolean,
  uses_personal_vehicle boolean,
  multi_state_work boolean,
  pays_own_subscriptions boolean,
  retirement_planning_interest boolean,
  combines_business_personal_travel boolean,
  buys_supplies_equipment boolean,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.tax_advisor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own tax advisor profiles"
  ON public.tax_advisor_profiles FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_tax_advisor_profiles_updated_at
  BEFORE UPDATE ON public.tax_advisor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Tax Advisor Sessions (chat history)
CREATE TABLE public.tax_advisor_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL DEFAULT '',
  prompt text NOT NULL,
  response text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tax_advisor_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own tax advisor sessions"
  ON public.tax_advisor_sessions FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Saved Tax Questions
CREATE TABLE public.saved_tax_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  question_text text NOT NULL,
  topic text NOT NULL DEFAULT 'general',
  saved_from_session_id uuid REFERENCES public.tax_advisor_sessions(id) ON DELETE SET NULL,
  include_in_summary boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_tax_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own saved tax questions"
  ON public.saved_tax_questions FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Tax Opportunity Review Items
CREATE TABLE public.tax_opportunity_review_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  category text NOT NULL,
  status text NOT NULL DEFAULT 'not_started',
  notes text DEFAULT '',
  last_reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, category)
);

ALTER TABLE public.tax_opportunity_review_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own tax opportunity review items"
  ON public.tax_opportunity_review_items FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_tax_opportunity_review_items_updated_at
  BEFORE UPDATE ON public.tax_opportunity_review_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
