CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _meta_tz text;
  _resolved_tz text;
  _supported_us_tz text[] := ARRAY[
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Phoenix',
    'America/Los_Angeles',
    'America/Anchorage',
    'Pacific/Honolulu'
  ];
  _alias_map jsonb := jsonb_build_object(
    'America/Detroit', 'America/New_York',
    'America/Indiana/Indianapolis', 'America/New_York',
    'America/Indiana/Marengo', 'America/New_York',
    'America/Indiana/Petersburg', 'America/New_York',
    'America/Indiana/Vevay', 'America/New_York',
    'America/Indiana/Vincennes', 'America/New_York',
    'America/Indiana/Winamac', 'America/New_York',
    'America/Kentucky/Louisville', 'America/New_York',
    'America/Kentucky/Monticello', 'America/New_York',
    'America/Indiana/Knox', 'America/Chicago',
    'America/Indiana/Tell_City', 'America/Chicago',
    'America/Menominee', 'America/Chicago',
    'America/North_Dakota/Beulah', 'America/Chicago',
    'America/North_Dakota/Center', 'America/Chicago',
    'America/North_Dakota/New_Salem', 'America/Chicago',
    'America/Boise', 'America/Denver',
    'America/Juneau', 'America/Anchorage',
    'America/Metlakatla', 'America/Anchorage',
    'America/Nome', 'America/Anchorage',
    'America/Sitka', 'America/Anchorage',
    'America/Yakutat', 'America/Anchorage',
    'America/Adak', 'Pacific/Honolulu'
  );
BEGIN
  _meta_tz := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'timezone', '')), '');

  IF _meta_tz IS NULL THEN
    _resolved_tz := 'America/New_York';
  ELSIF _meta_tz = ANY(_supported_us_tz) THEN
    _resolved_tz := _meta_tz;
  ELSIF _alias_map ? _meta_tz THEN
    _resolved_tz := _alias_map->>_meta_tz;
  ELSE
    -- Unrecognized / non-US tz: fall back to the column default rather than
    -- saving something the US-only selector can't render.
    _resolved_tz := 'America/New_York';
  END IF;

  INSERT INTO public.user_profiles (user_id, timezone)
  VALUES (NEW.id, _resolved_tz)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;