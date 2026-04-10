import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = [
  'https://locum-ops.lovable.app',
  'https://id-preview--2263427a-5054-4595-ad6b-d5ed09d0eb59.lovable.app',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (!token || token.length < 10 || token.length > 128) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Fetch confirmation record by share_token — explicit field selection
    const { data: record, error: recError } = await supabase
      .from('confirmation_records')
      .select('id, facility_id, user_id, month_key, status, sent_at, updated_at, created_at, share_token_revoked_at')
      .eq('share_token', token)
      .is('share_token_revoked_at', null)
      .single();

    if (recError || !record) {
      return new Response(JSON.stringify({ error: 'Confirmation not found or link revoked' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch related data in parallel with explicit field selection
    const [facRes, profileRes, linksRes] = await Promise.all([
      supabase.from('facilities').select('name').eq('id', record.facility_id).single(),
      supabase.from('user_profiles').select('first_name, last_name').eq('user_id', record.user_id).single(),
      supabase.from('confirmation_shift_links').select('shift_id').eq('confirmation_record_id', record.id),
    ]);

    const facilityName = facRes.data?.name || 'Practice';
    const profile = profileRes.data;
    const clinicianName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Relief Clinician';

    const shiftIds = (linksRes.data || []).map((l: any) => l.shift_id);
    let shifts: any[] = [];
    if (shiftIds.length > 0) {
      const { data: shiftData } = await supabase
        .from('shifts')
        .select('start_datetime, end_datetime, notes')
        .in('id', shiftIds)
        .order('start_datetime');
      shifts = (shiftData || []).map((s: any) => ({
        start_datetime: s.start_datetime,
        end_datetime: s.end_datetime,
        notes: s.notes || '',
      }));
    }

    return new Response(JSON.stringify({
      facilityName,
      clinicianName,
      monthKey: record.month_key,
      generatedAt: record.sent_at || record.updated_at || record.created_at,
      shifts,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('public-confirmation error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
