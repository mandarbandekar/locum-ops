
CREATE TABLE public.tax_payment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  tax_year integer NOT NULL,
  quarter text NOT NULL,
  payment_type text NOT NULL,
  state_key text,
  amount numeric NOT NULL DEFAULT 0,
  date_paid date NOT NULL DEFAULT CURRENT_DATE,
  paid_from text NOT NULL DEFAULT 'personal',
  confirmed_by_user boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tax_payment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own tax payment logs"
  ON public.tax_payment_logs FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_tax_payment_logs_updated_at
  BEFORE UPDATE ON public.tax_payment_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
