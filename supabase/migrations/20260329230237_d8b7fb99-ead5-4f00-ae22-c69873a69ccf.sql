
-- Extend credentials table with compliance workflow fields
ALTER TABLE public.credentials 
  ADD COLUMN IF NOT EXISTS renewal_open_date date,
  ADD COLUMN IF NOT EXISTS renewal_due_date date,
  ADD COLUMN IF NOT EXISTS renewal_url text,
  ADD COLUMN IF NOT EXISTS readiness_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS readiness_label text DEFAULT 'not_ready',
  ADD COLUMN IF NOT EXISTS holder_name text,
  ADD COLUMN IF NOT EXISTS jurisdiction_type text DEFAULT 'state',
  ADD COLUMN IF NOT EXISTS ce_logged_hours_cache numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS missing_items_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recommended_action text;

-- Create renewal_records table
CREATE TABLE IF NOT EXISTS public.renewal_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  credential_id uuid NOT NULL REFERENCES public.credentials(id) ON DELETE CASCADE,
  cycle_start_date date,
  cycle_end_date date,
  renewal_open_date date,
  renewal_due_date date,
  submitted_at timestamptz,
  confirmed_at timestamptz,
  confirmation_number text,
  renewal_status text NOT NULL DEFAULT 'upcoming',
  readiness_score integer DEFAULT 0,
  readiness_label text DEFAULT 'not_ready',
  missing_items_count integer DEFAULT 0,
  notes text DEFAULT '',
  metadata_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.renewal_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own renewal records" ON public.renewal_records
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create compliance_alerts table
CREATE TABLE IF NOT EXISTS public.compliance_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'needs_review',
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  related_entity_type text,
  related_entity_id uuid,
  primary_action_type text,
  action_payload_json jsonb DEFAULT '{}'::jsonb,
  is_dismissed boolean NOT NULL DEFAULT false,
  dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.compliance_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own compliance alerts" ON public.compliance_alerts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create compliance_activity_events table
CREATE TABLE IF NOT EXISTS public.compliance_activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  entity_type text NOT NULL,
  entity_id uuid,
  event_type text NOT NULL,
  event_summary text NOT NULL DEFAULT '',
  actor_type text NOT NULL DEFAULT 'user',
  metadata_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.compliance_activity_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own activity events" ON public.compliance_activity_events
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create document_links table for many-to-many linkage
CREATE TABLE IF NOT EXISTS public.document_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.credential_documents(id) ON DELETE CASCADE,
  link_entity_type text NOT NULL,
  link_entity_id uuid NOT NULL,
  link_role text DEFAULT 'supporting',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.document_links ENABLE ROW LEVEL SECURITY;

-- Need a helper function to check document ownership
CREATE OR REPLACE FUNCTION public.owns_document(_user_id uuid, _document_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.credential_documents WHERE id = _document_id AND user_id = _user_id);
$$;

CREATE POLICY "Users can CRUD own document links" ON public.document_links
  FOR ALL TO authenticated
  USING (owns_document(auth.uid(), document_id))
  WITH CHECK (owns_document(auth.uid(), document_id));

-- Add updated_at triggers for new tables
CREATE TRIGGER update_renewal_records_updated_at
  BEFORE UPDATE ON public.renewal_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_compliance_alerts_updated_at
  BEFORE UPDATE ON public.compliance_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_document_links_updated_at
  BEFORE UPDATE ON public.document_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable realtime for compliance_alerts for future use
ALTER PUBLICATION supabase_realtime ADD TABLE public.compliance_alerts;
