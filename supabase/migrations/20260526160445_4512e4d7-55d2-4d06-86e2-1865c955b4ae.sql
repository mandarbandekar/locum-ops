-- Bulk fix for 6 users whose clinics were created in April/early May with the
-- old LA default before the AddClinicStepper fix. Mirrors the Summers fix:
-- for each affected facility, flip tz to the user's profile tz and rebase
-- existing shifts so the wall-clock the user typed is reinterpreted in that tz.

DO $$
DECLARE
  affected_facility_ids uuid[];
  affected_shift_ids uuid[];
  fac_count int;
  shift_count int;
BEGIN
  -- Lock the exact set of facilities we plan to touch.
  SELECT array_agg(f.id) INTO affected_facility_ids
  FROM public.facilities f
  JOIN public.user_profiles up ON up.user_id = f.user_id
  JOIN auth.users u ON u.id = f.user_id
  WHERE u.email IN (
    'mnlinton@comcast.net','dr.rhoden@hotmail.com','julianna.eaton19@gmail.com',
    'emi.knafo@gmail.com','comptondvm3@gmail.com','myranewkirk@gmail.com'
  )
    AND f.timezone = 'America/Los_Angeles'
    AND up.timezone <> 'America/Los_Angeles';

  fac_count := COALESCE(array_length(affected_facility_ids, 1), 0);
  IF fac_count <> 20 THEN
    RAISE EXCEPTION 'Expected 20 affected facilities, found %', fac_count;
  END IF;

  SELECT array_agg(s.id) INTO affected_shift_ids
  FROM public.shifts s
  WHERE s.facility_id = ANY(affected_facility_ids)
    AND s.timezone_at_creation = 'America/Los_Angeles';

  shift_count := COALESCE(array_length(affected_shift_ids, 1), 0);
  IF shift_count <> 113 THEN
    RAISE EXCEPTION 'Expected 113 affected shifts, found %', shift_count;
  END IF;

  -- Rebase shifts: keep wall-clock, reinterpret in the user's profile tz.
  UPDATE public.shifts s
  SET
    start_datetime = (s.start_datetime AT TIME ZONE 'America/Los_Angeles') AT TIME ZONE up.timezone,
    end_datetime   = (s.end_datetime   AT TIME ZONE 'America/Los_Angeles') AT TIME ZONE up.timezone,
    timezone_at_creation = up.timezone
  FROM public.facilities f
  JOIN public.user_profiles up ON up.user_id = f.user_id
  WHERE s.facility_id = f.id
    AND s.id = ANY(affected_shift_ids);

  -- Flip facility tz to each owner's profile tz.
  UPDATE public.facilities f
  SET timezone = up.timezone
  FROM public.user_profiles up
  WHERE up.user_id = f.user_id
    AND f.id = ANY(affected_facility_ids);

  RAISE NOTICE 'Rebased % shifts across % facilities', shift_count, fac_count;
END $$;