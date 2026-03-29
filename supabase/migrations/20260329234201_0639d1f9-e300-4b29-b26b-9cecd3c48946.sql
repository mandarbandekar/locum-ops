
CREATE TABLE public.compliance_onboarding_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  has_seen_welcome boolean NOT NULL DEFAULT false,
  onboarding_started_at timestamptz,
  onboarding_completed_at timestamptz,
  onboarding_skipped_at timestamptz,
  selected_credential_types text[] NOT NULL DEFAULT '{}',
  first_credential_added boolean NOT NULL DEFAULT false,
  first_document_uploaded boolean NOT NULL DEFAULT false,
  first_ce_entry_added boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.compliance_onboarding_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own compliance onboarding state"
  ON public.compliance_onboarding_state
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.compliance_onboarding_state
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
