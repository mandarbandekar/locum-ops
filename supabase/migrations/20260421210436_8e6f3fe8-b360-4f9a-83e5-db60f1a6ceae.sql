-- Engagement type tracking: facility default + per-shift override

-- 1. Facilities: engagement_type, source_name, tax_form_type
ALTER TABLE public.facilities
  ADD COLUMN IF NOT EXISTS engagement_type text NOT NULL DEFAULT 'direct'
    CHECK (engagement_type IN ('direct','third_party','w2')),
  ADD COLUMN IF NOT EXISTS source_name text,
  ADD COLUMN IF NOT EXISTS tax_form_type text
    CHECK (tax_form_type IN ('1099','w2'));

-- 2. Shifts: per-shift overrides (nullable -> inherit facility default)
ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS engagement_type_override text
    CHECK (engagement_type_override IN ('direct','third_party','w2')),
  ADD COLUMN IF NOT EXISTS source_name_override text;

-- 3. Backfill existing rows explicitly (defaults already applied, but ensure nulls are normalized)
UPDATE public.facilities
  SET engagement_type = COALESCE(engagement_type, 'direct'),
      source_name = NULL
  WHERE engagement_type IS NULL OR engagement_type = '';

UPDATE public.shifts
  SET engagement_type_override = NULL,
      source_name_override = NULL
  WHERE engagement_type_override IS NOT NULL OR source_name_override IS NOT NULL;

-- 4. Helper view: effective engagement type per shift
CREATE OR REPLACE VIEW public.shift_effective_engagement
WITH (security_invoker = true)
AS
SELECT
  s.id              AS shift_id,
  s.user_id         AS user_id,
  s.facility_id     AS facility_id,
  COALESCE(s.engagement_type_override, f.engagement_type) AS effective_engagement_type,
  COALESCE(s.source_name_override, f.source_name)         AS effective_source_name,
  f.tax_form_type   AS tax_form_type
FROM public.shifts s
JOIN public.facilities f ON f.id = s.facility_id;

-- 5. Helper function: effective engagement type for a single shift id
CREATE OR REPLACE FUNCTION public.get_shift_effective_engagement(_shift_id uuid)
RETURNS TABLE (
  effective_engagement_type text,
  effective_source_name text,
  tax_form_type text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    COALESCE(s.engagement_type_override, f.engagement_type),
    COALESCE(s.source_name_override, f.source_name),
    f.tax_form_type
  FROM public.shifts s
  JOIN public.facilities f ON f.id = s.facility_id
  WHERE s.id = _shift_id;
$$;