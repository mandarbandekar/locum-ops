
ALTER TABLE public.shift_calendar_sync ADD COLUMN IF NOT EXISTS last_synced_hash text;

CREATE UNIQUE INDEX IF NOT EXISTS shift_calendar_sync_user_shift_uniq ON public.shift_calendar_sync (user_id, shift_id);
