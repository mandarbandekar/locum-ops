
-- Add sender profile fields to user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS first_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS last_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS company_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS company_address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS invoice_email text,
  ADD COLUMN IF NOT EXISTS invoice_phone text;

-- Add new fields to invoices
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS invoice_date timestamp with time zone NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS balance_due numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS share_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS share_token_created_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS share_token_revoked_at timestamp with time zone;

-- Add service_date to line items
ALTER TABLE public.invoice_line_items
  ADD COLUMN IF NOT EXISTS service_date date;

-- Create invoice_payments table
CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'other',
  account text NOT NULL DEFAULT 'Business Checking',
  memo text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own payments"
  ON public.invoice_payments
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create invoice_activity table
CREATE TABLE IF NOT EXISTS public.invoice_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  action text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own invoice activity"
  ON public.invoice_activity
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Update existing invoices to set balance_due = total_amount for non-paid
UPDATE public.invoices SET balance_due = total_amount WHERE status != 'paid';
UPDATE public.invoices SET balance_due = 0 WHERE status = 'paid';
UPDATE public.invoices SET invoice_date = created_at WHERE invoice_date = now();
