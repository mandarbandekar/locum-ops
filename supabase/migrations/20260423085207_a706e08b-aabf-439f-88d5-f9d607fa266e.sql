ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS default_rates jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS default_billing_preference text NOT NULL DEFAULT 'per_day';