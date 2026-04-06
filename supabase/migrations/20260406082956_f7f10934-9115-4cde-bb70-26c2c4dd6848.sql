
-- Add mileage tracking columns to expenses
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS is_auto_mileage boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mileage_status text NOT NULL DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS route_description text NOT NULL DEFAULT '';

-- Add home address to user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS home_address text NOT NULL DEFAULT '';

-- Add mileage override and coordinate cache to facilities
ALTER TABLE public.facilities
  ADD COLUMN IF NOT EXISTS mileage_override_miles numeric NULL,
  ADD COLUMN IF NOT EXISTS facility_coordinates jsonb NULL;

-- Index for finding draft mileage entries quickly
CREATE INDEX IF NOT EXISTS idx_expenses_mileage_status ON public.expenses (mileage_status) WHERE is_auto_mileage = true;
