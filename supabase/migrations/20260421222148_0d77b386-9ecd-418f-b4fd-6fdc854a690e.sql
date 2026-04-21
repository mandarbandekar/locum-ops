ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS engagement_announcement_dismissed_at timestamp with time zone;