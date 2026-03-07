
-- Add extra rate columns to terms_snapshots
ALTER TABLE public.terms_snapshots ADD COLUMN partial_day_rate numeric NOT NULL DEFAULT 0;
ALTER TABLE public.terms_snapshots ADD COLUMN holiday_rate numeric NOT NULL DEFAULT 0;
ALTER TABLE public.terms_snapshots ADD COLUMN telemedicine_rate numeric NOT NULL DEFAULT 0;

-- Add tech access and clinic access columns to facilities
ALTER TABLE public.facilities ADD COLUMN tech_computer_info text NOT NULL DEFAULT '';
ALTER TABLE public.facilities ADD COLUMN tech_wifi_info text NOT NULL DEFAULT '';
ALTER TABLE public.facilities ADD COLUMN tech_pims_info text NOT NULL DEFAULT '';
ALTER TABLE public.facilities ADD COLUMN clinic_access_info text NOT NULL DEFAULT '';
