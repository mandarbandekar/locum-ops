-- Relabel any existing overtime line items as regular so historical invoices still display cleanly.
UPDATE public.invoice_line_items SET line_kind = 'regular' WHERE line_kind = 'overtime';

-- Drop overtime breakdown columns from shifts. rate_applied (the stored $ total) is preserved.
ALTER TABLE public.shifts
  DROP COLUMN IF EXISTS overtime_hours,
  DROP COLUMN IF EXISTS overtime_rate,
  DROP COLUMN IF EXISTS regular_hours;

-- Drop structured OT config from terms snapshots. overtime_policy_text (free text) is kept.
ALTER TABLE public.terms_snapshots
  DROP COLUMN IF EXISTS overtime_config;