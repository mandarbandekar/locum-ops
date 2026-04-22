-- terms_snapshots: structured overtime per predefined rate
ALTER TABLE public.terms_snapshots
  ADD COLUMN IF NOT EXISTS overtime_config jsonb NOT NULL DEFAULT '{}'::jsonb;

-- shifts: capture OT calculation snapshot
ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS overtime_hours numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overtime_rate numeric,
  ADD COLUMN IF NOT EXISTS regular_hours numeric;

-- invoice_line_items: label regular/overtime/flat lines
ALTER TABLE public.invoice_line_items
  ADD COLUMN IF NOT EXISTS line_kind text NOT NULL DEFAULT 'regular';

-- Backfill: flat for qty=1 shift lines, regular otherwise (best-effort)
UPDATE public.invoice_line_items
SET line_kind = CASE
  WHEN shift_id IS NULL THEN 'regular'
  WHEN qty = 1 THEN 'flat'
  ELSE 'regular'
END
WHERE line_kind = 'regular';

-- Optional check constraint
DO $$ BEGIN
  ALTER TABLE public.invoice_line_items
    ADD CONSTRAINT invoice_line_items_line_kind_check
    CHECK (line_kind IN ('regular', 'overtime', 'flat'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;