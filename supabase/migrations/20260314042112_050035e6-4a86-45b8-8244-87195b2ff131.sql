
ALTER TABLE public.ce_entries ADD COLUMN delivery_format text NOT NULL DEFAULT '';
ALTER TABLE public.credentials ADD COLUMN ce_requirements_notes text;
