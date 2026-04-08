
CREATE TABLE public.suppressed_invoice_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  facility_id UUID NOT NULL,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, facility_id, period_start, period_end)
);

ALTER TABLE public.suppressed_invoice_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own suppressed periods"
  ON public.suppressed_invoice_periods
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
