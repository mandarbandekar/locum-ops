
ALTER TABLE public.facility_confirmation_settings
ADD COLUMN auto_send_monthly boolean NOT NULL DEFAULT false,
ADD COLUMN auto_send_preshift boolean NOT NULL DEFAULT false;

ALTER TABLE public.confirmation_emails
ADD COLUMN delivery_mode text NOT NULL DEFAULT 'manual_review';
