DO $$
DECLARE
  v_user_id uuid := '863c7791-a680-41c6-b3c2-c85a70542e7d';
  v_facility_ids uuid[] := ARRAY[
    'c8d8e4a0-6fee-4d51-81c4-e15c125ae370',
    '21ba9dca-2784-4d89-9423-095b95aaeab5',
    'bab838e6-5c95-49d7-890b-369f1d54d0c9'
  ]::uuid[];
  v_shifts_updated int;
  v_facilities_updated int;
BEGIN
  -- 1. Rebase shifts: keep wall-clock in Los_Angeles, reinterpret in Chicago.
  UPDATE public.shifts
  SET
    start_datetime = (start_datetime AT TIME ZONE 'America/Los_Angeles') AT TIME ZONE 'America/Chicago',
    end_datetime   = (end_datetime   AT TIME ZONE 'America/Los_Angeles') AT TIME ZONE 'America/Chicago',
    timezone_at_creation = 'America/Chicago',
    updated_at = now()
  WHERE user_id = v_user_id
    AND facility_id = ANY(v_facility_ids)
    AND timezone_at_creation = 'America/Los_Angeles';
  GET DIAGNOSTICS v_shifts_updated = ROW_COUNT;

  IF v_shifts_updated <> 58 THEN
    RAISE EXCEPTION 'Expected to update 58 shifts, but updated %', v_shifts_updated;
  END IF;

  -- 2. Flip facility timezones.
  UPDATE public.facilities
  SET timezone = 'America/Chicago',
      updated_at = now()
  WHERE user_id = v_user_id
    AND id = ANY(v_facility_ids)
    AND timezone = 'America/Los_Angeles';
  GET DIAGNOSTICS v_facilities_updated = ROW_COUNT;

  IF v_facilities_updated <> 3 THEN
    RAISE EXCEPTION 'Expected to update 3 facilities, but updated %', v_facilities_updated;
  END IF;

  RAISE NOTICE 'Successfully rebased % shifts across % facilities to America/Chicago', v_shifts_updated, v_facilities_updated;
END $$;