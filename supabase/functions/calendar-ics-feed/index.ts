import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function formatIcsDate(dateStr: string): string {
  const d = new Date(dateStr);
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

  // Validate token
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

  // Load user preferences
  const { data: prefs } = await supabase
    .from('calendar_sync_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  const includeAddress = prefs?.include_facility_address ?? true;
  const includeNotes = prefs?.include_notes ?? false;

  // Load booked future shifts
  const now = new Date().toISOString();
  const { data: shifts, error: shiftsError } = await supabase
    .from('shifts')
    .select('*')
    .eq('user_id', userId)
    .gte('start_datetime', now)
    .order('start_datetime', { ascending: true });

  if (shiftsError) {
    console.error('Failed to load shifts:', shiftsError);
    return new Response('Internal error', { status: 500, headers: corsHeaders });
  }

  // Load facilities for names and addresses
  const facilityIds = [...new Set((shifts || []).map((s: any) => s.facility_id))];
  let facilityMap: Record<string, any> = {};
  if (facilityIds.length > 0) {
    const { data: facilities } = await supabase
      .from('facilities')
      .select('id, name, address')
      .in('id', facilityIds);
    if (facilities) {
      facilityMap = Object.fromEntries(facilities.map((f: any) => [f.id, f]));
    }
  }

  // Generate ICS
  const events = (shifts || []).map((shift: any) => {
    const facility = facilityMap[shift.facility_id] || {};
    const lines = [
      'BEGIN:VEVENT',
      `UID:${shift.id}@locumops.app`,
      `DTSTART:${formatIcsDate(shift.start_datetime)}`,
      `DTEND:${formatIcsDate(shift.end_datetime)}`,
      `SUMMARY:${escapeIcsText(`Relief Shift — ${facility.name || 'Unknown'}`)}`,
      `DTSTAMP:${formatIcsDate(new Date().toISOString())}`,
    ];

    if (includeAddress && facility.address) {
      lines.push(`LOCATION:${escapeIcsText(facility.address)}`);
    }

    const descParts = [`Facility: ${facility.name || 'Unknown'}`];
    if (shift.rate_applied > 0) descParts.push(`Rate: $${shift.rate_applied}`);
    if (includeNotes && shift.notes) descParts.push(`Notes: ${shift.notes}`);
    lines.push(`DESCRIPTION:${escapeIcsText(descParts.join('\\n'))}`);
    lines.push('STATUS:CONFIRMED');
    lines.push('END:VEVENT');

    return lines.join('\r\n');
  });

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LocumOps//Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:LocumOps Shifts',
    'X-WR-TIMEZONE:UTC',
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
