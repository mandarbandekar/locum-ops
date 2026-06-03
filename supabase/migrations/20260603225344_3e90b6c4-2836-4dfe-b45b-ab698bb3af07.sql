ALTER TABLE public.facilities
  ADD COLUMN IF NOT EXISTS experience_positive_tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS experience_watchout_tags text[] NOT NULL DEFAULT '{}';

UPDATE public.facilities
SET
  experience_positive_tags = COALESCE(
    ARRAY(
      SELECT t FROM unnest(experience_tags) AS t
      WHERE t IN ('Friendly staff','Well-equipped','Organized records','Reasonable caseload','Good lunch break','Pays on time')
    ),
    '{}'
  ),
  experience_watchout_tags = COALESCE(
    ARRAY(
      SELECT t FROM unnest(experience_tags) AS t
      WHERE t IN ('Understaffed','Heavy caseload','Clunky PIMS','Disorganized','Slow payer','Poor handoff')
    ),
    '{}'
  )
WHERE experience_tags IS NOT NULL
  AND array_length(experience_tags, 1) > 0
  AND (array_length(experience_positive_tags, 1) IS NULL AND array_length(experience_watchout_tags, 1) IS NULL);