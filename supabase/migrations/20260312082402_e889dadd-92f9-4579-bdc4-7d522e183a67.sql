
-- Confirmation records table
CREATE TABLE public.confirmation_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  month_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_sent',
  sent_at TIMESTAMP WITH TIME ZONE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  share_token TEXT,
  share_token_created_at TIMESTAMP WITH TIME ZONE,
  share_token_revoked_at TIMESTAMP WITH TIME ZONE,
  shift_count_snapshot INTEGER,
  shift_hash_snapshot TEXT,
  last_shift_snapshot_at TIMESTAMP WITH TIME ZONE,
  message_body TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, facility_id, month_key)
);

-- Enable RLS
ALTER TABLE public.confirmation_records ENABLE ROW LEVEL SECURITY;

-- RLS policy
CREATE POLICY "Users can CRUD own confirmation records"
  ON public.confirmation_records
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_confirmation_records_updated_at
  BEFORE UPDATE ON public.confirmation_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Confirmation shift links table
CREATE TABLE public.confirmation_shift_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  confirmation_record_id UUID NOT NULL REFERENCES public.confirmation_records(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.confirmation_shift_links ENABLE ROW LEVEL SECURITY;

-- RLS via parent ownership check
CREATE OR REPLACE FUNCTION public.owns_confirmation(_user_id uuid, _confirmation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.confirmation_records WHERE id = _confirmation_id AND user_id = _user_id);
$$;

CREATE POLICY "Users can CRUD own confirmation shift links"
  ON public.confirmation_shift_links
  FOR ALL
  TO authenticated
  USING (owns_confirmation(auth.uid(), confirmation_record_id))
  WITH CHECK (owns_confirmation(auth.uid(), confirmation_record_id));

-- Confirmation activity/timeline table
CREATE TABLE public.confirmation_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  confirmation_record_id UUID NOT NULL REFERENCES public.confirmation_records(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.confirmation_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own confirmation activity"
  ON public.confirmation_activity
  FOR ALL
  TO authenticated
  USING (owns_confirmation(auth.uid(), confirmation_record_id))
  WITH CHECK (owns_confirmation(auth.uid(), confirmation_record_id));

-- Enable realtime for confirmation_records
ALTER PUBLICATION supabase_realtime ADD TABLE public.confirmation_records;
