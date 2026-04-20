ALTER TABLE public.tax_intelligence_profiles
ADD COLUMN IF NOT EXISTS work_states JSONB NOT NULL DEFAULT '[]'::jsonb;