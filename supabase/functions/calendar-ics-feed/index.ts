import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getPartsInTz } from '../_shared/tzTime.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FALLBACK_TZ = 'America/New_York';

const US_VTIMEZONE_BLOCKS: Record<string, string> = {
  'America/Los_Angeles': [
    'BEGIN:VTIMEZONE', 'TZID:America/Los_Angeles',
    'BEGIN:DAYLIGHT', 'TZOFFSETFROM:-0800', 'TZOFFSETTO:-0700', 'TZNAME:PDT',
    'DTSTART:19700308T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU', 'END:DAYLIGHT',
    'BEGIN:STANDARD', 'TZOFFSETFROM:-0700', 'TZOFFSETTO:-0800', 'TZNAME:PST',
    'DTSTART:19701101T020000', 'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU', 'END:STANDARD',
    'END:VTIMEZONE',
  ].join('\r\n'),
  'America/Denver': [
    'BEGIN:VTIMEZONE', 'TZID:America/Denver',
    'BEGIN:DAYLIGHT', 'TZOFFSETFROM:-0700', 'TZOFFSETTO:-0600', 'TZNAME:MDT',
    'DTSTART:19700308T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU', 'END:DAYLIGHT',
    'BEGIN:STANDARD', 'TZOFFSETFROM:-0600', 'TZOFFSETTO:-0700', 'TZNAME:MST',
    'DTSTART:19701101T020000', 'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU', 'END:STANDARD',
    'END:VTIMEZONE',
  ].join('\r\n'),
  'America/Chicago': [
    'BEGIN:VTIMEZONE', 'TZID:America/Chicago',
    'BEGIN:DAYLIGHT', 'TZOFFSETFROM:-0600', 'TZOFFSETTO:-0500', 'TZNAME:CDT',
    'DTSTART:19700308T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU', 'END:DAYLIGHT',
    'BEGIN:STANDARD', 'TZOFFSETFROM:-0500', 'TZOFFSETTO:-0600', 'TZNAME:CST',
    'DTSTART:19701101T020000', 'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU', 'END:STANDARD',
    'END:VTIMEZONE',
  ].join('\r\n'),
  'America/New_York': [
    'BEGIN:VTIMEZONE', 'TZID:America/New_York',
    'BEGIN:DAYLIGHT', 'TZOFFSETFROM:-0500', 'TZOFFSETTO:-0400', 'TZNAME:EDT',
    'DTSTART:19700308T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU', 'END:DAYLIGHT',
    'BEGIN:STANDARD', 'TZOFFSETFROM:-0400', 'TZOFFSETTO:-0500', 'TZNAME:EST',
    'DTSTART:19701101T020000', 'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU', 'END:STANDARD',
    'END:VTIMEZONE',
  ].join('\r\n'),
  'America/Anchorage': [
    'BEGIN:VTIMEZONE', 'TZID:America/Anchorage',
    'BEGIN:DAYLIGHT', 'TZOFFSETFROM:-0900', 'TZOFFSETTO:-0800', 'TZNAME:AKDT',
    'DTSTART:19700308T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU', 'END:DAYLIGHT',
    'BEGIN:STANDARD', 'TZOFFSETFROM:-0800', 'TZOFFSETTO:-0900', 'TZNAME:AKST',
    'DTSTART:19701101T020000', 'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU', 'END:STANDARD',
    'END:VTIMEZONE',
  ].join('\r\n'),
  'America/Phoenix': [
    'BEGIN:VTIMEZONE', 'TZID:America/Phoenix',
    'BEGIN:STANDARD', 'TZOFFSETFROM:-0700', 'TZOFFSETTO:-0700', 'TZNAME:MST',
    'DTSTART:19700101T000000', 'END:STANDARD',
    'END:VTIMEZONE',
  ].join('\r\n'),
  'Pacific/Honolulu': [
    'BEGIN:VTIMEZONE', 'TZID:Pacific/Honolulu',
    'BEGIN:STANDARD', 'TZOFFSETFROM:-1000', 'TZOFFSETTO:-1000', 'TZNAME:HST',
    'DTSTART:19700101T000000', 'END:STANDARD',
    'END:VTIMEZONE',
  ].join('\r\n'),
};

function vtimezoneBlockFor(tz: string): string | null {
  return US_VTIMEZONE_BLOCKS[tz] ?? null;
}

function isValidIanaTz(tz: string | null | undefined): boolean {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function clean(tz: string | null | undefined): string | null {
  if (!tz) return null;
  const t = String(tz).trim();
  return t.length > 0 ? t : null;
}

function resolveShiftTz(
  shift: { timezone_at_creation?: string | null },
  facility: { timezone?: string | null } | null | undefined,
  profile: { timezone?: string | null } | null | undefined,
): string {
  return clean(shift?.timezone_at_creation)
    || clean(facility?.timezone)
    || clean(profile?.timezone)
    || FALLBACK_TZ;
}

function formatLocalIcsDate(iso: string, tz: string): string {
  const p = getPartsInTz(iso, tz);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${p.year}${pad(p.month)}${pad(p.day)}T${pad(p.hour)}${pad(p.minute)}${pad(p.second)}`;
}

function formatUtcIcsDate(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return new Response('Missing token', { status: 400, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: tokenRecord, error: tokenError } = await supabase
    .from('calendar_feed_tokens')
    .select('*')
    .eq('token', token)
    .is('revoked_at', null)
    .maybeSingle();

  if (tokenError || !tokenRecord) {
    return new Response('Invalid or revoked token', { status: 403, headers: corsHeaders });
  }

  const userId = tokenRecord.user_id;

  const { data: prefs } = await supabase
    .from('calendar_sync_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  const includeAddress = prefs?.include_facility_address ?? true;
  const includeNotes = prefs?.include_notes ?? false;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('timezone')
    .eq('user_id', userId)
    .maybeSingle();

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data: shifts, error: shiftsError } = await supabase
    .from('shifts')
    .select('*')
    .eq('user_id', userId)
    .gte('start_datetime', ninetyDaysAgo)
    .order('start_datetime', { ascending: true });

  if (shiftsError) {
    console.error('Failed to load shifts:', shiftsError);
    return new Response('Internal error', { status: 500, headers: corsHeaders });
  }

  const facilityIds = [...new Set((shifts || []).map((s: any) => s.facility_id))];
  let facilityMap: Record<string, any> = {};
  if (facilityIds.length > 0) {
    const { data: facilities } = await supabase
      .from('facilities')
      .select('id, name, address, timezone')
      .in('id', facilityIds);
    if (facilities) {
      facilityMap = Object.fromEntries(facilities.map((f: any) => [f.id, f]));
    }
  }

  const usedTzs = new Set<string>();

  const events = (shifts || []).map((shift: any) => {
    const facility = facilityMap[shift.facility_id] || {};
    const resolved = resolveShiftTz(shift, facility, profile);
    // Unknown/invalid IANA → fall the whole event back to ET. Never emit a
    // TZID a calendar client can't resolve.
    const tz = isValidIanaTz(resolved) ? resolved : FALLBACK_TZ;
    usedTzs.add(tz);

    const lines = [
      'BEGIN:VEVENT',
      `UID:${shift.id}@locumops.app`,
      `DTSTART;TZID=${tz}:${formatLocalIcsDate(shift.start_datetime, tz)}`,
      `DTEND;TZID=${tz}:${formatLocalIcsDate(shift.end_datetime, tz)}`,
      `SUMMARY:${escapeIcsText(`Relief Shift — ${facility.name || 'Unknown'}`)}`,
      `DTSTAMP:${formatUtcIcsDate(new Date().toISOString())}`,
    ];

    if (includeAddress && facility.address) {
      lines.push(`LOCATION:${escapeIcsText(facility.address)}`);
    }

    const descParts = [`Facility: ${facility.name || 'Unknown'}`];
    if (shift.rate_applied > 0) descParts.push(`Rate: $${shift.rate_applied}`);
    if (includeNotes && shift.notes) descParts.push(`Notes: ${shift.notes}`);
    descParts.push('');
    descParts.push('Times shown are clinic local time.');
    descParts.push(`Clinic timezone: ${tz}`);
    lines.push(`DESCRIPTION:${escapeIcsText(descParts.join('\\n'))}`);
    lines.push('STATUS:CONFIRMED');
    lines.push('END:VEVENT');

    return lines.join('\r\n');
  });

  const primaryTz = usedTzs.size > 0
    ? Array.from(usedTzs)[0]
    : (clean(profile?.timezone) || FALLBACK_TZ);
  // Only include VTIMEZONE blocks we have matching rules for. For other
  // valid IANA zones, the bare TZID is correct; mismatched rules would be
  // worse than none.
  const vtimezones = Array.from(usedTzs)
    .map(vtimezoneBlockFor)
    .filter((b): b is string => b !== null);

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LocumOps//Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:LocumOps Shifts',
    `X-WR-TIMEZONE:${primaryTz}`,
    ...vtimezones,
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');

  return new Response(ics, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="locumops-shifts.ics"',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
});
