
-- Add ce_required_hours to credentials
ALTER TABLE public.credentials ADD COLUMN ce_required_hours numeric DEFAULT NULL;

-- Create ce_entries table
CREATE TABLE public.ce_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  provider text NOT NULL DEFAULT '',
  completion_date date NOT NULL,
  hours numeric NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT '',
  notes text DEFAULT '',
  certificate_file_url text DEFAULT NULL,
  certificate_file_name text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ce_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own CE entries"
ON public.ce_entries FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create ce_credential_links table
CREATE TABLE public.ce_credential_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ce_entry_id uuid NOT NULL REFERENCES public.ce_entries(id) ON DELETE CASCADE,
  credential_id uuid NOT NULL REFERENCES public.credentials(id) ON DELETE CASCADE,
  UNIQUE(ce_entry_id, credential_id)
);

ALTER TABLE public.ce_credential_links ENABLE ROW LEVEL SECURITY;

-- Helper function for RLS
CREATE OR REPLACE FUNCTION public.owns_ce_entry(_user_id uuid, _ce_entry_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.ce_entries WHERE id = _ce_entry_id AND user_id = _user_id);
$$;

CREATE POLICY "Users can CRUD own CE credential links"
ON public.ce_credential_links FOR ALL
USING (owns_ce_entry(auth.uid(), ce_entry_id))
WITH CHECK (owns_ce_entry(auth.uid(), ce_entry_id));

-- Updated_at trigger for ce_entries
CREATE TRIGGER update_ce_entries_updated_at
  BEFORE UPDATE ON public.ce_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
