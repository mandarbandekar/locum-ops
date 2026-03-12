ALTER TABLE public.waitlist_leads
ADD COLUMN facility_count text NOT NULL DEFAULT '',
ADD COLUMN headache text NOT NULL DEFAULT '',
ADD COLUMN profession text NOT NULL DEFAULT '';