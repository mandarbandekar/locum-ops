
-- 1. Backfill: rename duplicates, keeping the earliest row's number intact
WITH ranked AS (
  SELECT id, user_id, invoice_number,
         ROW_NUMBER() OVER (PARTITION BY user_id, invoice_number ORDER BY created_at, id) AS rn
  FROM public.invoices
)
UPDATE public.invoices i
SET invoice_number = r.invoice_number || '-DUP-' || r.rn
FROM ranked r
WHERE i.id = r.id AND r.rn > 1;

-- 2. Add unique constraint
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_user_invoice_number_unique UNIQUE (user_id, invoice_number);

-- 3. Atomic next-number function using advisory locks per (user, prefix, year)
CREATE OR REPLACE FUNCTION public.next_invoice_number(_prefix text, _year int)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _max int;
  _next int;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(_uid::text || '|' || _prefix || '|' || _year::text, 0));

  SELECT COALESCE(MAX(
    CASE
      WHEN invoice_number ~ ('^' || _prefix || '-' || _year || '-\d+$')
      THEN (regexp_match(invoice_number, '(\d+)$'))[1]::int
      ELSE 0
    END
  ), 0) INTO _max
  FROM public.invoices
  WHERE user_id = _uid
    AND invoice_number LIKE _prefix || '-' || _year || '-%';

  _next := _max + 1;
  RETURN _prefix || '-' || _year || '-' || lpad(_next::text, 3, '0');
END;
$$;

-- Service-role variant for edge functions (no auth.uid())
CREATE OR REPLACE FUNCTION public.next_invoice_number_for_user(_user_id uuid, _prefix text, _year int)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _max int;
  _next int;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(_user_id::text || '|' || _prefix || '|' || _year::text, 0));

  SELECT COALESCE(MAX(
    CASE
      WHEN invoice_number ~ ('^' || _prefix || '-' || _year || '-\d+$')
      THEN (regexp_match(invoice_number, '(\d+)$'))[1]::int
      ELSE 0
    END
  ), 0) INTO _max
  FROM public.invoices
  WHERE user_id = _user_id
    AND invoice_number LIKE _prefix || '-' || _year || '-%';

  _next := _max + 1;
  RETURN _prefix || '-' || _year || '-' || lpad(_next::text, 3, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.next_invoice_number_for_user(uuid, text, int) FROM public, anon, authenticated;
