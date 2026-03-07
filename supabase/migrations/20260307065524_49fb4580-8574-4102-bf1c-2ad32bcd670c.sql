
-- Create user_profiles table
CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profession text NOT NULL DEFAULT 'other',
  work_style_label text NOT NULL DEFAULT '',
  timezone text NOT NULL DEFAULT 'America/New_York',
  currency text NOT NULL DEFAULT 'USD',
  current_tools jsonb NOT NULL DEFAULT '[]'::jsonb,
  facilities_count_band text NOT NULL DEFAULT 'band_1_3',
  invoices_per_month_band text NOT NULL DEFAULT 'inv_1_3',
  invoice_due_default_days integer NOT NULL DEFAULT 14,
  invoice_prefix text NOT NULL DEFAULT 'INV',
  email_tone text NOT NULL DEFAULT 'neutral',
  terms_fields_enabled jsonb NOT NULL DEFAULT '{"weekday_rate":true,"weekend_rate":true,"cancellation_policy":true,"overtime_policy":true,"late_payment_policy":true,"special_notes":true}'::jsonb,
  onboarding_completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS: users can CRUD own profile
CREATE POLICY "Users can CRUD own user_profiles"
  ON public.user_profiles
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-create user_profile on signup via trigger
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile();

-- Updated_at trigger
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
