CREATE OR REPLACE FUNCTION public.get_founder_overview()
  RETURNS TABLE(user_id uuid, email text, display_name text, signed_up_at timestamp with time zone, last_sign_in_at timestamp with time zone, clinic_count integer, shift_count integer, invoice_count integer, downloaded_invoice_count integer, credential_count integer, expense_count integer, last_activity_at timestamp with time zone, activation_status text, last_device text, desktop_sign_ins integer, mobile_sign_ins integer, tablet_sign_ins integer)
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
    SELECT f.user_id, COUNT(*)::int AS c, MAX(f.created_at) AS last_at FROM public.facilities f GROUP BY f.user_id
  ),
  shift_stats AS (
    SELECT s.user_id, COUNT(*)::int AS c, MAX(s.created_at) AS last_at FROM public.shifts s GROUP BY s.user_id
  ),
  invoice_stats AS (
    SELECT i.user_id, COUNT(*)::int AS c, MAX(i.created_at) AS last_at FROM public.invoices i GROUP BY i.user_id
  ),
  download_stats AS (
    SELECT d.user_id, COALESCE(SUM(d.download_count), 0)::int AS c FROM public.invoice_pdf_downloads d GROUP BY d.user_id
  ),
  credential_stats AS (
    SELECT c.user_id, COUNT(*)::int AS c FROM public.credentials c GROUP BY c.user_id
  ),
  expense_stats AS (
    SELECT e.user_id, COUNT(*)::int AS c FROM public.expenses e GROUP BY e.user_id
  ),
  device_stats AS (
    SELECT
      ev.user_id,
      SUM(CASE WHEN ev.device_type = 'desktop' THEN 1 ELSE 0 END)::int AS desktop_c,
      SUM(CASE WHEN ev.device_type = 'mobile' THEN 1 ELSE 0 END)::int AS mobile_c,
      SUM(CASE WHEN ev.device_type = 'tablet' THEN 1 ELSE 0 END)::int AS tablet_c
    FROM public.user_sign_in_events ev
    GROUP BY ev.user_id
  ),
  last_device AS (
    SELECT DISTINCT ON (ev.user_id) ev.user_id, ev.device_type
    FROM public.user_sign_in_events ev
    ORDER BY ev.user_id, ev.created_at DESC
  )
  SELECT
    u.id,
    u.email::text,
    COALESCE(p.display_name, u.email)::text,
    u.created_at,
    u.last_sign_in_at,
    COALESCE(fs.c, 0), COALESCE(ss.c, 0), COALESCE(invs.c, 0),
    COALESCE(ds.c, 0), COALESCE(cs.c, 0), COALESCE(es.c, 0),
    GREATEST(
      COALESCE(fs.last_at, 'epoch'::timestamptz),
      COALESCE(ss.last_at, 'epoch'::timestamptz),
      COALESCE(invs.last_at, 'epoch'::timestamptz),
      COALESCE(u.last_sign_in_at, 'epoch'::timestamptz)
    ),
    CASE
      WHEN u.last_sign_in_at IS NULL THEN 'never'
      ELSE 'active'
    END,
    ld.device_type,
    COALESCE(dvs.desktop_c, 0),
    COALESCE(dvs.mobile_c, 0),
    COALESCE(dvs.tablet_c, 0)
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN facility_stats fs ON fs.user_id = u.id
  LEFT JOIN shift_stats ss ON ss.user_id = u.id
  LEFT JOIN invoice_stats invs ON invs.user_id = u.id
  LEFT JOIN download_stats ds ON ds.user_id = u.id
  LEFT JOIN credential_stats cs ON cs.user_id = u.id
  LEFT JOIN expense_stats es ON es.user_id = u.id
  LEFT JOIN device_stats dvs ON dvs.user_id = u.id
  LEFT JOIN last_device ld ON ld.user_id = u.id
  ORDER BY u.created_at DESC;
END;
$function$;