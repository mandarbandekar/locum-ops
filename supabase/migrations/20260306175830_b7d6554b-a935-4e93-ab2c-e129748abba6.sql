
-- Credential types enum
CREATE TYPE public.credential_type AS ENUM (
  'veterinary_license',
  'dea_registration',
  'state_controlled_substance',
  'usda_accreditation',
  'malpractice_insurance',
  'professional_liability_insurance',
  'workers_comp_policy',
  'business_license',
  'llc_scorp_registration',
  'w9',
  'ce_certificate',
  'background_check',
  'contractor_onboarding',
  'vaccination_health_record',
  'custom'
);

CREATE TYPE public.credential_status AS ENUM (
  'active', 'expiring_soon', 'expired', 'renewing', 'archived'
);

CREATE TYPE public.reminder_type AS ENUM (
  'email', 'sms', 'in_app'
);

CREATE TYPE public.reminder_status AS ENUM (
  'pending', 'sent', 'acknowledged', 'snoozed'
);

CREATE TYPE public.renewal_action_type AS ENUM (
  'renewed', 'updated', 'created', 'archived'
);

CREATE TYPE public.requirement_status AS ENUM (
  'pending', 'complete', 'expired', 'missing'
);

CREATE TYPE public.packet_status AS ENUM (
  'draft', 'ready', 'sent', 'expired'
);

CREATE TYPE public.document_category AS ENUM (
  'license', 'registration', 'insurance', 'tax', 'onboarding', 'ce', 'legal_business', 'identity', 'custom'
);

-- Main credentials table
CREATE TABLE public.credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_type public.credential_type NOT NULL DEFAULT 'custom',
  custom_title TEXT NOT NULL,
  jurisdiction TEXT,
  issuing_authority TEXT,
  credential_number TEXT,
  issue_date DATE,
  expiration_date DATE,
  renewal_frequency TEXT,
  status public.credential_status NOT NULL DEFAULT 'active',
  notes TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own credentials" ON public.credentials
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Credential documents table
CREATE TABLE public.credential_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id UUID REFERENCES public.credentials(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  document_category public.document_category NOT NULL DEFAULT 'custom',
  version_number INT NOT NULL DEFAULT 1,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.credential_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own documents" ON public.credential_documents
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Credential reminders
CREATE TABLE public.credential_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id UUID NOT NULL REFERENCES public.credentials(id) ON DELETE CASCADE,
  reminder_type public.reminder_type NOT NULL DEFAULT 'in_app',
  remind_at TIMESTAMPTZ NOT NULL,
  status public.reminder_status NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.credential_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own reminders" ON public.credential_reminders
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Credential history
CREATE TABLE public.credential_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id UUID NOT NULL REFERENCES public.credentials(id) ON DELETE CASCADE,
  previous_expiration_date DATE,
  new_expiration_date DATE,
  action_type public.renewal_action_type NOT NULL DEFAULT 'renewed',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.credential_history ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.owns_credential(_user_id UUID, _credential_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.credentials WHERE id = _credential_id AND user_id = _user_id);
$$;

CREATE POLICY "Users can manage history of own credentials" ON public.credential_history
  FOR ALL TO authenticated USING (public.owns_credential(auth.uid(), credential_id))
  WITH CHECK (public.owns_credential(auth.uid(), credential_id));

-- Clinic requirements
CREATE TABLE public.clinic_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id TEXT NOT NULL,
  requirement_name TEXT NOT NULL,
  requirement_type public.credential_type NOT NULL DEFAULT 'custom',
  required BOOLEAN NOT NULL DEFAULT true,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clinic_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read clinic requirements" ON public.clinic_requirements
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage clinic requirements" ON public.clinic_requirements
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update clinic requirements" ON public.clinic_requirements
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete clinic requirements" ON public.clinic_requirements
  FOR DELETE TO authenticated USING (true);

-- Clinic requirement mappings
CREATE TABLE public.clinic_requirement_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id TEXT NOT NULL,
  requirement_id UUID NOT NULL REFERENCES public.clinic_requirements(id) ON DELETE CASCADE,
  credential_id UUID REFERENCES public.credentials(id) ON DELETE SET NULL,
  document_id UUID REFERENCES public.credential_documents(id) ON DELETE SET NULL,
  status public.requirement_status NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clinic_requirement_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage mappings" ON public.clinic_requirement_mappings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Credential packets
CREATE TABLE public.credential_packets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id TEXT,
  title TEXT NOT NULL,
  share_token TEXT UNIQUE,
  packet_status public.packet_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);
ALTER TABLE public.credential_packets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own packets" ON public.credential_packets
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Credential packet items
CREATE TABLE public.credential_packet_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  packet_id UUID NOT NULL REFERENCES public.credential_packets(id) ON DELETE CASCADE,
  credential_id UUID REFERENCES public.credentials(id) ON DELETE SET NULL,
  document_id UUID REFERENCES public.credential_documents(id) ON DELETE SET NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.credential_packet_items ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.owns_packet(_user_id UUID, _packet_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.credential_packets WHERE id = _packet_id AND user_id = _user_id);
$$;

CREATE POLICY "Users can manage own packet items" ON public.credential_packet_items
  FOR ALL TO authenticated USING (public.owns_packet(auth.uid(), packet_id))
  WITH CHECK (public.owns_packet(auth.uid(), packet_id));

-- Storage bucket for credential documents
INSERT INTO storage.buckets (id, name, public) VALUES ('credential-documents', 'credential-documents', false);

CREATE POLICY "Users can upload own credential docs" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'credential-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read own credential docs" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'credential-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own credential docs" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'credential-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own credential docs" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'credential-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER credentials_updated_at BEFORE UPDATE ON public.credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER credential_documents_updated_at BEFORE UPDATE ON public.credential_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
