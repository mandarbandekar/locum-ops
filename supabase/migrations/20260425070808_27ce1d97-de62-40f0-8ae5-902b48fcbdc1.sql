CREATE OR REPLACE FUNCTION public.get_founder_overview()
 RETURNS TABLE(user_id uuid, email text, display_name text, signed_up_at timestamp with time zone, last_sign_in_at timestamp with time zone, clinic_count integer, shift_count integer, invoice_count integer, last_activity_at timestamp with time zone, activation_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller_email text;
  admin_emails text[] := ARRAY['mandar@locum-ops.com', 'mr.mandarbandekar@gmail.com'];
BEGIN
  caller_email := lower(coalesce(auth.email(), ''));
  IF caller_email = '' OR NOT (caller_email = ANY (SELECT lower(unnest(admin_emails)))) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH facility_stats AS (
    SELECT f.user_id, COUNT(*)::int AS c, MAX(f.created_at) AS last_at
    FROM public.facilities f GROUP BY f.user_id
  ),
  shift_stats AS (
    SELECT s.user_id, COUNT(*)::int AS c, MAX(s.created_at) AS last_at
    FROM public.shifts s GROUP BY s.user_id
  ),
  invoice_stats AS (
    SELECT i.user_id, COUNT(*)::int AS c, MAX(i.created_at) AS last_at
    FROM public.invoices i GROUP BY i.user_id
  )
  SELECT
    u.id AS user_id,
    u.email::text AS email,
    COALESCE(p.display_name, u.email)::text AS display_name,
    u.created_at AS signed_up_at,
    u.last_sign_in_at,
    COALESCE(fs.c, 0) AS clinic_count,
    COALESCE(ss.c, 0) AS shift_count,
    COALESCE(invs.c, 0) AS invoice_count,
    GREATEST(
      COALESCE(fs.last_at, 'epoch'::timestamptz),
      COALESCE(ss.last_at, 'epoch'::timestamptz),
      COALESCE(invs.last_at, 'epoch'::timestamptz),
      COALESCE(u.last_sign_in_at, 'epoch'::timestamptz)
    ) AS last_activity_at,
    CASE
      WHEN u.last_sign_in_at IS NULL THEN 'never'
      WHEN u.last_sign_in_at >= now() - interval '7 days' THEN 'active'
      ELSE 'dormant'
    END AS activation_status
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN facility_stats fs ON fs.user_id = u.id
  LEFT JOIN shift_stats ss ON ss.user_id = u.id
  LEFT JOIN invoice_stats invs ON invs.user_id = u.id
  ORDER BY u.created_at DESC;
END;
$function$;