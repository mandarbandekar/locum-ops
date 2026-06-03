ALTER TABLE public.invoice_line_items
  ADD COLUMN IF NOT EXISTS user_edited_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_user_edited_at
  ON public.invoice_line_items (invoice_id) WHERE user_edited_at IS NOT NULL;