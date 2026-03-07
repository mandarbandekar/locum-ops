
-- Contracts table
CREATE TABLE public.contracts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  effective_date date,
  end_date date,
  auto_renew boolean NOT NULL DEFAULT false,
  file_url text,
  external_link_url text,
  notes text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own contracts" ON public.contracts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Contract Terms table
CREATE TABLE public.contract_terms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  weekday_rate numeric,
  weekend_rate numeric,
  holiday_rate numeric,
  payment_terms_days integer,
  cancellation_policy_text text DEFAULT '',
  overtime_policy_text text DEFAULT '',
  late_payment_policy_text text DEFAULT '',
  invoicing_instructions_text text DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own contract terms" ON public.contract_terms
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_contract_terms_updated_at BEFORE UPDATE ON public.contract_terms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Contract Checklist Items table
CREATE TABLE public.contract_checklist_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  type text NOT NULL DEFAULT 'other',
  title text NOT NULL,
  status text NOT NULL DEFAULT 'needed',
  due_date date,
  notes text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own checklist items" ON public.contract_checklist_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_checklist_items_updated_at BEFORE UPDATE ON public.contract_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime for contracts
ALTER PUBLICATION supabase_realtime ADD TABLE public.contracts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_terms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_checklist_items;
