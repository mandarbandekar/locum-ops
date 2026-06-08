
CREATE OR REPLACE FUNCTION public.get_user_latest_session_activity(_user_id uuid)
RETURNS TABLE(
  session_start timestamptz,
  device_type text,
  shifts_count int,
  invoices_count int,
  expenses_count int,
  credentials_count int,
  credential_documents_count int,
  facilities_count int,
  contracts_count int,
  time_blocks_count int,
  reminders_count int,
  ce_entries_count int,
  tax_payment_logs_count int,
  confirmation_records_count int,
  invoice_pdf_downloads_count int,
  last_action_table text,
  last_action_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  caller_email text;
  admin_emails text[] := ARRAY['mandar@locum-ops.com', 'mr.mandarbandekar@gmail.com'];
  _start timestamptz;
  _device text;
BEGIN
  caller_email := lower(coalesce(auth.email(), ''));
  IF caller_email = '' OR NOT (caller_email = ANY (SELECT lower(unnest(admin_emails)))) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT ev.created_at, ev.device_type
    INTO _start, _device
  FROM public.user_sign_in_events ev
  WHERE ev.user_id = _user_id
  ORDER BY ev.created_at DESC
  LIMIT 1;

  IF _start IS NULL THEN
    _start := now() - INTERVAL '24 hours';
  END IF;

  RETURN QUERY
  WITH touched AS (
    SELECT 'shifts'::text AS t, GREATEST(s.created_at, s.updated_at) AS ts
      FROM public.shifts s WHERE s.user_id = _user_id AND (s.created_at >= _start OR s.updated_at >= _start)
    UNION ALL
    SELECT 'invoices', GREATEST(i.created_at, i.updated_at)
      FROM public.invoices i WHERE i.user_id = _user_id AND (i.created_at >= _start OR i.updated_at >= _start)
    UNION ALL
    SELECT 'expenses', GREATEST(e.created_at, e.updated_at)
      FROM public.expenses e WHERE e.user_id = _user_id AND (e.created_at >= _start OR e.updated_at >= _start)
    UNION ALL
    SELECT 'credentials', GREATEST(c.created_at, c.updated_at)
      FROM public.credentials c WHERE c.user_id = _user_id AND (c.created_at >= _start OR c.updated_at >= _start)
    UNION ALL
    SELECT 'credential_documents', GREATEST(cd.created_at, cd.updated_at)
      FROM public.credential_documents cd WHERE cd.user_id = _user_id AND (cd.created_at >= _start OR cd.updated_at >= _start)
    UNION ALL
    SELECT 'facilities', GREATEST(f.created_at, f.updated_at)
      FROM public.facilities f WHERE f.user_id = _user_id AND (f.created_at >= _start OR f.updated_at >= _start)
    UNION ALL
    SELECT 'contracts', GREATEST(co.created_at, co.updated_at)
      FROM public.contracts co WHERE co.user_id = _user_id AND (co.created_at >= _start OR co.updated_at >= _start)
    UNION ALL
    SELECT 'time_blocks', GREATEST(tb.created_at, tb.updated_at)
      FROM public.time_blocks tb WHERE tb.user_id = _user_id AND (tb.created_at >= _start OR tb.updated_at >= _start)
    UNION ALL
    SELECT 'reminders', GREATEST(r.created_at, r.updated_at)
      FROM public.reminders r WHERE r.user_id = _user_id AND (r.created_at >= _start OR r.updated_at >= _start)
    UNION ALL
    SELECT 'ce_entries', GREATEST(ce.created_at, ce.updated_at)
      FROM public.ce_entries ce WHERE ce.user_id = _user_id AND (ce.created_at >= _start OR ce.updated_at >= _start)
    UNION ALL
    SELECT 'tax_payment_logs', GREATEST(tp.created_at, tp.updated_at)
      FROM public.tax_payment_logs tp WHERE tp.user_id = _user_id AND (tp.created_at >= _start OR tp.updated_at >= _start)
    UNION ALL
    SELECT 'confirmation_records', GREATEST(cr.created_at, cr.updated_at)
      FROM public.confirmation_records cr WHERE cr.user_id = _user_id AND (cr.created_at >= _start OR cr.updated_at >= _start)
    UNION ALL
    SELECT 'invoice_pdf_downloads', d.last_downloaded_at
      FROM public.invoice_pdf_downloads d WHERE d.user_id = _user_id AND d.last_downloaded_at >= _start
  )
  SELECT
    _start,
    _device,
    COUNT(*) FILTER (WHERE t = 'shifts')::int,
    COUNT(*) FILTER (WHERE t = 'invoices')::int,
    COUNT(*) FILTER (WHERE t = 'expenses')::int,
    COUNT(*) FILTER (WHERE t = 'credentials')::int,
    COUNT(*) FILTER (WHERE t = 'credential_documents')::int,
    COUNT(*) FILTER (WHERE t = 'facilities')::int,
    COUNT(*) FILTER (WHERE t = 'contracts')::int,
    COUNT(*) FILTER (WHERE t = 'time_blocks')::int,
    COUNT(*) FILTER (WHERE t = 'reminders')::int,
    COUNT(*) FILTER (WHERE t = 'ce_entries')::int,
    COUNT(*) FILTER (WHERE t = 'tax_payment_logs')::int,
    COUNT(*) FILTER (WHERE t = 'confirmation_records')::int,
    COUNT(*) FILTER (WHERE t = 'invoice_pdf_downloads')::int,
    (SELECT t FROM touched ORDER BY ts DESC NULLS LAST LIMIT 1),
    (SELECT ts FROM touched ORDER BY ts DESC NULLS LAST LIMIT 1)
  FROM touched;
END;
$function$;
