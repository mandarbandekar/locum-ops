CREATE OR REPLACE FUNCTION public.get_shift_local_date(_shift_id uuid)
RETURNS date
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT (s.start_datetime AT TIME ZONE COALESCE(NULLIF(trim(s.timezone_at_creation), ''), f.timezone))::date
  FROM public.shifts s
  JOIN public.facilities f ON f.id = s.facility_id
  WHERE s.id = _shift_id;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_shift_local_date(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_shift_local_date(uuid) TO authenticated;