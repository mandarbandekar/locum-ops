CREATE TABLE public.shift_payment_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL UNIQUE REFERENCES public.shifts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'wont_pay')),
  amount_received numeric(12,2),
  paid_on date,
  note text,
  snoozed_until date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_shift_payment_confirmations_user ON public.shift_payment_confirmations(user_id);
CREATE INDEX idx_shift_payment_confirmations_status ON public.shift_payment_confirmations(user_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_payment_confirmations TO authenticated;
GRANT ALL ON public.shift_payment_confirmations TO service_role;

ALTER TABLE public.shift_payment_confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own payment confirmations"
  ON public.shift_payment_confirmations
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER shift_payment_confirmations_updated_at
  BEFORE UPDATE ON public.shift_payment_confirmations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();