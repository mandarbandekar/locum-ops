
-- Facility confirmation settings (per-facility scheduling/confirmation preferences)
CREATE TABLE public.facility_confirmation_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  primary_contact_name TEXT NOT NULL DEFAULT '',
  primary_contact_email TEXT NOT NULL DEFAULT '',
  secondary_contact_email TEXT NOT NULL DEFAULT '',
  monthly_enabled BOOLEAN NOT NULL DEFAULT true,
  monthly_send_offset_days INTEGER NOT NULL DEFAULT 7,
  preshift_enabled BOOLEAN NOT NULL DEFAULT false,
  preshift_send_offset_days INTEGER NOT NULL DEFAULT 3,
  auto_send_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(facility_id, user_id)
);

ALTER TABLE public.facility_confirmation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own facility_confirmation_settings"
  ON public.facility_confirmation_settings
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Confirmation emails (both monthly and pre-shift)
CREATE TABLE public.confirmation_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
  month_key TEXT,
  type TEXT NOT NULL DEFAULT 'monthly',
  recipient_email TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'scheduled',
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  shift_hash_snapshot TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.confirmation_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own confirmation_emails"
  ON public.confirmation_emails
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Confirmation snapshots (shift data at time of send)
CREATE TABLE public.confirmation_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  confirmation_email_id UUID NOT NULL REFERENCES public.confirmation_emails(id) ON DELETE CASCADE,
  shift_count_snapshot INTEGER NOT NULL DEFAULT 0,
  shift_data_snapshot JSONB,
  last_shift_snapshot_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.confirmation_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own confirmation_snapshots"
  ON public.confirmation_snapshots
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.confirmation_emails ce
      WHERE ce.id = confirmation_email_id AND ce.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.confirmation_emails ce
      WHERE ce.id = confirmation_email_id AND ce.user_id = auth.uid()
    )
  );

-- Add updated_at trigger to new tables
CREATE TRIGGER set_updated_at_facility_confirmation_settings
  BEFORE UPDATE ON public.facility_confirmation_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at_confirmation_emails
  BEFORE UPDATE ON public.confirmation_emails
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
