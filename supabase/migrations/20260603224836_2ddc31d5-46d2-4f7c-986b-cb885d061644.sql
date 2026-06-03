ALTER TABLE public.facilities
  ADD COLUMN IF NOT EXISTS experience_notes text,
  ADD COLUMN IF NOT EXISTS experience_tags text[] NOT NULL DEFAULT '{}';