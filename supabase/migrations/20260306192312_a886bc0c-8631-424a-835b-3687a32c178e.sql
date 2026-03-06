
CREATE TABLE public.tax_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tax_year integer NOT NULL,
  filing_type_label text NOT NULL DEFAULT '',
  state_label text NOT NULL DEFAULT '',
  set_aside_mode text NOT NULL DEFAULT 'percent',
  set_aside_percent numeric NOT NULL DEFAULT 30,
  set_aside_fixed_monthly numeric NOT NULL DEFAULT 0,
  disclaimer_accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, tax_year)
);

ALTER TABLE public.tax_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own tax settings"
  ON public.tax_settings FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.tax_quarter_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tax_year integer NOT NULL,
  quarter integer NOT NULL CHECK (quarter >= 1 AND quarter <= 4),
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'not_started',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, tax_year, quarter)
);

ALTER TABLE public.tax_quarter_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own tax quarter statuses"
  ON public.tax_quarter_statuses FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_tax_settings_updated_at BEFORE UPDATE ON public.tax_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_tax_quarter_statuses_updated_at BEFORE UPDATE ON public.tax_quarter_statuses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
