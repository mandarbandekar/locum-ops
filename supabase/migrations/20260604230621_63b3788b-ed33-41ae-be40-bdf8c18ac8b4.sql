ALTER TABLE public.expense_config ALTER COLUMN irs_mileage_rate_cents TYPE numeric(6,2);
ALTER TABLE public.expense_config ALTER COLUMN irs_mileage_rate_cents SET DEFAULT 72.5;
UPDATE public.expense_config SET irs_mileage_rate_cents = 72.5;
UPDATE public.expenses
SET amount_cents = ROUND(amount_cents * 72.5 / 70.0),
    deductible_amount_cents = ROUND(deductible_amount_cents * 72.5 / 70.0)
WHERE mileage_miles IS NOT NULL;