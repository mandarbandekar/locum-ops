CREATE OR REPLACE FUNCTION public.normalize_invoice_prefix()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.invoice_prefix IS NOT NULL THEN
    NEW.invoice_prefix := regexp_replace(NEW.invoice_prefix, '\s+', '', 'g');
    IF NEW.invoice_prefix = '' THEN
      NEW.invoice_prefix := 'INV';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS facilities_normalize_invoice_prefix ON public.facilities;
CREATE TRIGGER facilities_normalize_invoice_prefix
BEFORE INSERT OR UPDATE OF invoice_prefix ON public.facilities
FOR EACH ROW EXECUTE FUNCTION public.normalize_invoice_prefix();

UPDATE public.facilities
SET invoice_prefix = regexp_replace(invoice_prefix, '\s+', '', 'g')
WHERE invoice_prefix IS NOT NULL
  AND invoice_prefix <> regexp_replace(invoice_prefix, '\s+', '', 'g');

UPDATE public.invoices AS inv
SET invoice_number = regexp_replace(inv.invoice_number, '\s+(?=-?\d{4}-\d+)', '', 'g')
WHERE inv.invoice_number ~ '\s+-?\d{4}-\d+'
  AND NOT EXISTS (
    SELECT 1 FROM public.invoices i2
    WHERE i2.user_id = inv.user_id
      AND i2.id <> inv.id
      AND i2.invoice_number = regexp_replace(inv.invoice_number, '\s+(?=-?\d{4}-\d+)', '', 'g')
  );