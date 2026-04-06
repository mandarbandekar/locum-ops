
-- Create expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT '',
  subcategory TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  facility_id UUID REFERENCES public.facilities(id) ON DELETE SET NULL,
  shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
  receipt_url TEXT,
  deductible_amount_cents INTEGER NOT NULL DEFAULT 0,
  deductibility_type TEXT NOT NULL DEFAULT 'full',
  mileage_miles NUMERIC,
  home_office_sqft NUMERIC,
  prorate_percent NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create expense_config table
CREATE TABLE public.expense_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() UNIQUE,
  irs_mileage_rate_cents INTEGER NOT NULL DEFAULT 70,
  home_office_rate_cents INTEGER NOT NULL DEFAULT 500,
  tax_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::integer,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_config ENABLE ROW LEVEL SECURITY;

-- RLS policies for expenses
CREATE POLICY "Users can CRUD own expenses"
ON public.expenses FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS policies for expense_config
CREATE POLICY "Users can CRUD own expense config"
ON public.expense_config FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_expenses_user_date ON public.expenses (user_id, expense_date DESC);
CREATE INDEX idx_expenses_category ON public.expenses (user_id, category);

-- Updated_at triggers
CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_expense_config_updated_at
BEFORE UPDATE ON public.expense_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Storage bucket for receipts
INSERT INTO storage.buckets (id, name, public) VALUES ('expense-receipts', 'expense-receipts', false);

-- Storage policies
CREATE POLICY "Users can upload own receipts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'expense-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own receipts"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'expense-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own receipts"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'expense-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own receipts"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'expense-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
