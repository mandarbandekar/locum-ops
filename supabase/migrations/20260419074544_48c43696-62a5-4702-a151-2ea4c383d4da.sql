ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS dashboard_intro_dismissed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dashboard_levelup_shown boolean NOT NULL DEFAULT false;