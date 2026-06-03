CREATE OR REPLACE FUNCTION public.audit_invoice_line_mismatches()
RETURNS TABLE (
  user_id uuid,
  user_email text,
  invoice_id uuid,
  invoice_number text,
  invoice_status text,
  generation_type text,
  line_id uuid,
  line_kind text,
  line_description text,
  line_qty numeric,
  line_unit_rate numeric,
  line_total numeric,
  expected_line_total numeric,
  shift_id uuid,
  shift_rate_kind text,
  shift_rate_applied numeric,
  shift_hourly_rate numeric,
  mismatch_reasons text[],
  user_edited_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_email text;
  admin_emails text[] := ARRAY['mandar@locum-ops.com', 'mr.mandarbandekar@gmail.com'];
BEGIN
  caller_email := lower(coalesce(auth.email(), ''));
  IF caller_email = '' OR NOT (caller_email = ANY (SELECT lower(unnest(admin_emails)))) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH joined AS (
    SELECT
      i.user_id,
      u.email::text AS user_email,
      i.id AS invoice_id,
      i.invoice_number,
      i.status::text AS invoice_status,
      i.generation_type::text,
      li.id AS line_id,
      li.line_kind::text,
      li.description AS line_description,
      li.qty AS line_qty,
      li.unit_rate AS line_unit_rate,
      li.line_total,
      ROUND((li.qty * li.unit_rate)::numeric, 2) AS expected_line_total,
      s.id AS shift_id,
      s.rate_kind::text AS shift_rate_kind,
      s.rate_applied AS shift_rate_applied,
      s.hourly_rate AS shift_hourly_rate,
      li.user_edited_at
    FROM public.invoice_line_items li
    JOIN public.invoices i ON i.id = li.invoice_id
    LEFT JOIN public.shifts s ON s.id = li.shift_id
    LEFT JOIN auth.users u ON u.id = i.user_id
  )
  SELECT
    j.user_id,
    j.user_email,
    j.invoice_id,
    j.invoice_number,
    j.invoice_status,
    j.generation_type,
    j.line_id,
    j.line_kind,
    j.line_description,
    j.line_qty,
    j.line_unit_rate,
    j.line_total,
    j.expected_line_total,
    j.shift_id,
    j.shift_rate_kind,
    j.shift_rate_applied,
    j.shift_hourly_rate,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN j.shift_id IS NOT NULL
              AND j.line_kind = 'regular'
              AND j.shift_rate_kind = 'flat'
            THEN 'flat_shift_billed_as_hourly' END,
      CASE WHEN j.shift_id IS NOT NULL
              AND j.line_kind = 'flat'
              AND j.shift_rate_kind = 'hourly'
            THEN 'hourly_shift_billed_as_flat' END,
      CASE WHEN j.shift_id IS NOT NULL
              AND j.line_kind = 'flat'
              AND j.shift_rate_kind = 'flat'
              AND j.shift_rate_applied IS NOT NULL
              AND ROUND(j.line_unit_rate::numeric, 2) <> ROUND(j.shift_rate_applied::numeric, 2)
            THEN 'flat_unit_rate_differs_from_shift' END,
      CASE WHEN ABS(j.line_total - ROUND((j.line_qty * j.line_unit_rate)::numeric, 2)) > 0.02
            THEN 'line_total_math_mismatch' END
    ], NULL) AS mismatch_reasons,
    j.user_edited_at
  FROM joined j
  WHERE
    (j.shift_id IS NOT NULL AND j.line_kind = 'regular' AND j.shift_rate_kind = 'flat')
    OR (j.shift_id IS NOT NULL AND j.line_kind = 'flat' AND j.shift_rate_kind = 'hourly')
    OR (j.shift_id IS NOT NULL AND j.line_kind = 'flat' AND j.shift_rate_kind = 'flat'
        AND j.shift_rate_applied IS NOT NULL
        AND ROUND(j.line_unit_rate::numeric, 2) <> ROUND(j.shift_rate_applied::numeric, 2))
    OR (ABS(j.line_total - ROUND((j.line_qty * j.line_unit_rate)::numeric, 2)) > 0.02)
  ORDER BY j.user_email NULLS LAST, j.invoice_number;
END;
$$;

REVOKE ALL ON FUNCTION public.audit_invoice_line_mismatches() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.audit_invoice_line_mismatches() TO authenticated;