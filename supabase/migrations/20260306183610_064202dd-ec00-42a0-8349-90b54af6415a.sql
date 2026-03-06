
-- Facilities table
CREATE TABLE public.facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'prospect',
  address text NOT NULL DEFAULT '',
  timezone text NOT NULL DEFAULT 'America/Los_Angeles',
  notes text NOT NULL DEFAULT '',
  outreach_last_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own facilities" ON public.facilities FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Facility contacts table
CREATE TABLE public.facility_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  facility_id uuid REFERENCES public.facilities(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'other',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.facility_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own contacts" ON public.facility_contacts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Terms snapshots table
CREATE TABLE public.terms_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  facility_id uuid REFERENCES public.facilities(id) ON DELETE CASCADE NOT NULL,
  weekday_rate numeric NOT NULL DEFAULT 0,
  weekend_rate numeric NOT NULL DEFAULT 0,
  cancellation_policy_text text NOT NULL DEFAULT '',
  overtime_policy_text text NOT NULL DEFAULT '',
  late_payment_policy_text text NOT NULL DEFAULT '',
  special_notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.terms_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own terms" ON public.terms_snapshots FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Shifts table
CREATE TABLE public.shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  facility_id uuid REFERENCES public.facilities(id) ON DELETE CASCADE NOT NULL,
  start_datetime timestamptz NOT NULL,
  end_datetime timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'proposed',
  rate_applied numeric NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own shifts" ON public.shifts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Invoices table
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  facility_id uuid REFERENCES public.facilities(id) ON DELETE CASCADE NOT NULL,
  invoice_number text NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  sent_at timestamptz,
  paid_at timestamptz,
  due_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own invoices" ON public.invoices FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Invoice line items table
CREATE TABLE public.invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  shift_id uuid REFERENCES public.shifts(id) ON DELETE SET NULL,
  description text NOT NULL DEFAULT '',
  qty numeric NOT NULL DEFAULT 1,
  unit_rate numeric NOT NULL DEFAULT 0,
  line_total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own line items" ON public.invoice_line_items FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Email logs table
CREATE TABLE public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  facility_id uuid REFERENCES public.facilities(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  subject text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  recipients text NOT NULL DEFAULT '',
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own email logs" ON public.email_logs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
