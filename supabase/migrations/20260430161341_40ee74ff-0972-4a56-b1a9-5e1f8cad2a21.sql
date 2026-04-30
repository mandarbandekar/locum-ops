-- Expense attachments
CREATE TABLE public.expense_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL DEFAULT '',
  file_type text,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_expense_attachments_expense ON public.expense_attachments(expense_id);
CREATE INDEX idx_expense_attachments_user ON public.expense_attachments(user_id);

ALTER TABLE public.expense_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own expense attachments"
  ON public.expense_attachments FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Contract attachments
CREATE TABLE public.contract_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL DEFAULT '',
  file_type text,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_contract_attachments_contract ON public.contract_attachments(contract_id);
CREATE INDEX idx_contract_attachments_user ON public.contract_attachments(user_id);

ALTER TABLE public.contract_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own contract attachments"
  ON public.contract_attachments FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);