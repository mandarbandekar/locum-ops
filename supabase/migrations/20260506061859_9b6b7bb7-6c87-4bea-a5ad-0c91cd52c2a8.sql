-- Backfill q1-q4 estimated payments into tax_payment_logs
INSERT INTO public.tax_payment_logs (user_id, tax_year, quarter, payment_type, amount, paid_from, confirmed_by_user)
SELECT user_id, EXTRACT(YEAR FROM now())::int, 'Q1', 'federal_1040es', q1_estimated_payment, 'personal', true
FROM public.tax_intelligence_profiles WHERE COALESCE(q1_estimated_payment, 0) > 0;

INSERT INTO public.tax_payment_logs (user_id, tax_year, quarter, payment_type, amount, paid_from, confirmed_by_user)
SELECT user_id, EXTRACT(YEAR FROM now())::int, 'Q2', 'federal_1040es', q2_estimated_payment, 'personal', true
FROM public.tax_intelligence_profiles WHERE COALESCE(q2_estimated_payment, 0) > 0;

INSERT INTO public.tax_payment_logs (user_id, tax_year, quarter, payment_type, amount, paid_from, confirmed_by_user)
SELECT user_id, EXTRACT(YEAR FROM now())::int, 'Q3', 'federal_1040es', q3_estimated_payment, 'personal', true
FROM public.tax_intelligence_profiles WHERE COALESCE(q3_estimated_payment, 0) > 0;

INSERT INTO public.tax_payment_logs (user_id, tax_year, quarter, payment_type, amount, paid_from, confirmed_by_user)
SELECT user_id, EXTRACT(YEAR FROM now())::int, 'Q4', 'federal_1040es', q4_estimated_payment, 'personal', true
FROM public.tax_intelligence_profiles WHERE COALESCE(q4_estimated_payment, 0) > 0;

ALTER TABLE public.tax_intelligence_profiles
  DROP COLUMN IF EXISTS q1_estimated_payment,
  DROP COLUMN IF EXISTS q2_estimated_payment,
  DROP COLUMN IF EXISTS q3_estimated_payment,
  DROP COLUMN IF EXISTS q4_estimated_payment;