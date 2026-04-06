
CREATE TABLE public.production_benchmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  avg_daily_production_cents INTEGER NOT NULL DEFAULT 0,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.production_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own production benchmarks"
ON public.production_benchmarks
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_production_benchmarks_updated_at
BEFORE UPDATE ON public.production_benchmarks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
