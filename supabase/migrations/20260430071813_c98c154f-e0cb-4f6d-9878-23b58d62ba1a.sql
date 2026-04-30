
-- Track distinct invoice PDF downloads per user
CREATE TABLE public.invoice_pdf_downloads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  invoice_id UUID NOT NULL,
  download_count INTEGER NOT NULL DEFAULT 1,
  first_downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT invoice_pdf_downloads_user_invoice_key UNIQUE (user_id, invoice_id)
);

CREATE INDEX idx_invoice_pdf_downloads_user_id ON public.invoice_pdf_downloads(user_id);

ALTER TABLE public.invoice_pdf_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own download records"
ON public.invoice_pdf_downloads
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage downloads"
ON public.invoice_pdf_downloads
FOR ALL
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Update founder overview to include new counts
DROP FUNCTION IF EXISTS public.get_founder_overview();

CREATE OR REPLACE FUNCTION public.get_founder_overview()
 RETURNS TABLE(
   user_id uuid,
   email text,
   display_name text,
   signed_up_at timestamp with time zone,
   last_sign_in_at timestamp with time zone,
   clinic_count integer,
   shift_count integer,
   invoice_count integer,
   downloaded_invoice_count integer,
   credential_count integer,
   expense_count integer,
   last_activity_at timestamp with time zone,
   activation_status text
 )
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
  ),
  download_stats AS (
    SELECT d.user_id, COUNT(DISTINCT d.invoice_id)::int AS c
    FROM public.invoice_pdf_downloads d GROUP BY d.user_id
  ),
  credential_stats AS (
    SELECT c.user_id, COUNT(*)::int AS c
    FROM public.credentials c GROUP BY c.user_id
  ),
  expense_stats AS (
    SELECT e.user_id, COUNT(*)::int AS c
    FROM public.expenses e GROUP BY e.user_id
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
    COALESCE(ds.c, 0) AS downloaded_invoice_count,
    COALESCE(cs.c, 0) AS credential_count,
    COALESCE(es.c, 0) AS expense_count,
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
  LEFT JOIN download_stats ds ON ds.user_id = u.id
  LEFT JOIN credential_stats cs ON cs.user_id = u.id
  LEFT JOIN expense_stats es ON es.user_id = u.id
  ORDER BY u.created_at DESC;
END;
$function$;
