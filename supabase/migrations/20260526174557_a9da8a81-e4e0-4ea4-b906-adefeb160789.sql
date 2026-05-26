-- 1. Cleanup: delete the stale duplicate draft for user 302869ed (WPV 14-DUP-2).
-- Its only shift (516085a9) is already included in WPV-2026-003 for the same period.
DELETE FROM public.invoice_line_items WHERE invoice_id = '13e017ca-dd56-453b-a081-f47bbb8cbbcc';
DELETE FROM public.invoices WHERE id = '13e017ca-dd56-453b-a081-f47bbb8cbbcc';

-- 2. Prevent the same shift from being billed twice as the same line kind.
-- Overtime + regular for the same shift are still allowed (different line_kind).
CREATE UNIQUE INDEX IF NOT EXISTS invoice_line_items_unique_shift_kind
  ON public.invoice_line_items (user_id, shift_id, line_kind)
  WHERE shift_id IS NOT NULL;

-- 3. Prevent two automatic draft invoices for the same facility + period_start.
-- Scoped to drafts so legacy / sent / paid duplicates aren't touched.
CREATE UNIQUE INDEX IF NOT EXISTS invoices_unique_auto_draft_period
  ON public.invoices (user_id, facility_id, period_start)
  WHERE status = 'draft' AND generation_type = 'automatic';