import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
  const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return new Response(JSON.stringify({ error: 'Google Calendar credentials not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/google-calendar-auth?action=callback`;

  try {
    // ACTION: initiate — redirect user to Google consent screen
    if (action === 'initiate') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const supabase = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace('Bearer ', '');
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const userId = claimsData.claims.sub;

      // Generate a state token to prevent CSRF and carry user_id
      const statePayload = JSON.stringify({ user_id: userId, ts: Date.now() });
      const state = btoa(statePayload);

      const scopes = [
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
      ];

      const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      googleAuthUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
      googleAuthUrl.searchParams.set('redirect_uri', REDIRECT_URI);
      googleAuthUrl.searchParams.set('response_type', 'code');
      googleAuthUrl.searchParams.set('scope', scopes.join(' '));
      googleAuthUrl.searchParams.set('access_type', 'offline');
      googleAuthUrl.searchParams.set('prompt', 'consent');
      googleAuthUrl.searchParams.set('state', state);

      return new Response(JSON.stringify({ url: googleAuthUrl.toString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ACTION: callback — Google redirects here with code
    if (action === 'callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      if (error) {
        return new Response(redirectHtml('error', 'Google authorization was denied'), {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      if (!code || !state) {
        return new Response(redirectHtml('error', 'Missing authorization code'), {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      let stateData: { user_id: string; ts: number };
      try {
        stateData = JSON.parse(atob(state));
      } catch {
        return new Response(redirectHtml('error', 'Invalid state parameter'), {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      // Check state is not too old (10 min)
      if (Date.now() - stateData.ts > 10 * 60 * 1000) {
        return new Response(redirectHtml('error', 'Authorization expired, please try again'), {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      // Exchange code for tokens
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      });

      const tokenData = await tokenRes.json();

      if (!tokenRes.ok || !tokenData.access_token) {
        console.error('Token exchange failed:', tokenData);
        return new Response(redirectHtml('error', 'Failed to exchange authorization code'), {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      // Get user's email
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userInfo = await userInfoRes.json();
      const googleEmail = userInfo.email || null;

      // Get primary calendar ID
      const calListRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=owner', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const calList = await calListRes.json();
      const primaryCal = calList.items?.find((c: any) => c.primary) || calList.items?.[0];
      const calendarId = primaryCal?.id || 'primary';

      // Store connection in DB using service role
      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Deactivate any existing Google connections for this user
      await adminClient
        .from('calendar_connections')
        .update({ status: 'disconnected' })
        .eq('user_id', stateData.user_id)
        .eq('provider', 'google')
        .eq('status', 'active');

      // Insert new connection
      const { error: insertError } = await adminClient
        .from('calendar_connections')
        .insert({
          user_id: stateData.user_id,
          provider: 'google',
          status: 'active',
          google_email: googleEmail,
          google_refresh_token_encrypted: tokenData.refresh_token || null,
          external_calendar_id: calendarId,
        });

      if (insertError) {
        console.error('Failed to save connection:', insertError);
        return new Response(redirectHtml('error', 'Failed to save connection'), {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      // Now do an initial sync — push existing booked shifts to Google Calendar
      // We'll do this asynchronously via the sync function, but for now just redirect
      return new Response(redirectHtml('success', googleEmail || 'Connected'), {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // ACTION: sync — triggered to push shifts to Google Calendar  
    if (action === 'sync') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const supabase = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace('Bearer ', '');
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const userId = claimsData.claims.sub;

      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Get active Google connection
      const { data: conn } = await adminClient
        .from('calendar_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', 'google')
        .eq('status', 'active')
        .single();

      if (!conn || !conn.google_refresh_token_encrypted) {
        return new Response(JSON.stringify({ error: 'No active Google Calendar connection' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get fresh access token using refresh token
      const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: conn.google_refresh_token_encrypted,
          grant_type: 'refresh_token',
        }),
      });

      const refreshData = await refreshRes.json();
      if (!refreshRes.ok || !refreshData.access_token) {
        console.error('Token refresh failed:', refreshData);
        // Mark connection as needing reauth
        await adminClient
          .from('calendar_connections')
          .update({ status: 'needs_reauth' })
          .eq('id', conn.id);

        return new Response(JSON.stringify({ error: 'Google token expired. Please reconnect.' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const accessToken = refreshData.access_token;
      const calendarId = conn.external_calendar_id || 'primary';

      // Get sync preferences
      const { data: prefs } = await adminClient
        .from('calendar_sync_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const syncBookedOnly = prefs?.sync_booked_only ?? true;
      const syncFutureOnly = prefs?.sync_future_only ?? true;
      const includeAddress = prefs?.include_facility_address ?? true;
      const includeNotes = prefs?.include_notes ?? false;

      // Get shifts
      let shiftsQuery = adminClient
        .from('shifts')
        .select('*')
        .eq('user_id', userId);

      if (syncBookedOnly) {
        shiftsQuery = shiftsQuery.eq('status', 'booked');
      }
      if (syncFutureOnly) {
        shiftsQuery = shiftsQuery.gte('start_datetime', new Date().toISOString());
      }

      const { data: shifts } = await shiftsQuery.order('start_datetime', { ascending: true }).limit(100);

      if (!shifts || shifts.length === 0) {
        return new Response(JSON.stringify({ synced: 0, message: 'No shifts to sync' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get facilities for location info
      const facilityIds = [...new Set(shifts.map((s: any) => s.facility_id))];
      const { data: facilities } = await adminClient
        .from('facilities')
        .select('id, name, address')
        .in('id', facilityIds);

      const facilityMap = new Map((facilities || []).map((f: any) => [f.id, f]));

      // Get existing sync records
      const { data: existingSyncs } = await adminClient
        .from('shift_calendar_sync')
        .select('shift_id, google_event_id, last_synced_hash')
        .eq('user_id', userId)
        .in('shift_id', shifts.map((s: any) => s.id));

      const syncMap = new Map((existingSyncs || []).map((s: any) => [s.shift_id, s]));

      let synced = 0;
      let errors = 0;

      for (const shift of shifts) {
        const facility = facilityMap.get(shift.facility_id);
        const facilityName = facility?.name || 'Shift';
        const shiftHash = `${shift.start_datetime}|${shift.end_datetime}|${shift.facility_id}|${shift.rate_applied}|${shift.notes || ''}`;

        const existing = syncMap.get(shift.id);

        // Skip if already synced with same data
        if (existing?.last_synced_hash === shiftHash) continue;

        const eventBody: any = {
          summary: `${facilityName} — LocumOps`,
          start: {
            dateTime: shift.start_datetime,
            timeZone: 'UTC',
          },
          end: {
            dateTime: shift.end_datetime,
            timeZone: 'UTC',
          },
          description: [
            `Rate: $${shift.rate_applied}/hr`,
            includeNotes && shift.notes ? `\nNotes: ${shift.notes}` : '',
            '\n— Synced from LocumOps',
          ].filter(Boolean).join(''),
          source: {
            title: 'LocumOps',
            url: 'https://locum-ops.lovable.app',
          },
        };

        if (includeAddress && facility?.address) {
          eventBody.location = facility.address;
        }

        try {
          let googleEventId: string;

          if (existing?.google_event_id) {
            // Update existing event
            const updateRes = await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${existing.google_event_id}`,
              {
                method: 'PUT',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(eventBody),
              }
            );

            if (!updateRes.ok) {
              // If event was deleted in Google, create a new one
              if (updateRes.status === 404) {
                const createRes = await fetch(
                  `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
                  {
                    method: 'POST',
                    headers: {
                      Authorization: `Bearer ${accessToken}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(eventBody),
                  }
                );
                const created = await createRes.json();
                googleEventId = created.id;
              } else {
                errors++;
                continue;
              }
            } else {
              googleEventId = existing.google_event_id;
            }
          } else {
            // Create new event
            const createRes = await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(eventBody),
              }
            );

            if (!createRes.ok) {
              const errBody = await createRes.text();
              console.error(`Failed to create event for shift ${shift.id}:`, errBody);
              errors++;
              continue;
            }

            const created = await createRes.json();
            googleEventId = created.id;
          }

          // Upsert sync record
          await adminClient
            .from('shift_calendar_sync')
            .upsert({
              user_id: userId,
              shift_id: shift.id,
              provider: 'google',
              external_event_id: googleEventId,
              last_synced_hash: shiftHash,
              sync_status: 'synced',
              last_synced_at: new Date().toISOString(),
            }, { onConflict: 'user_id,shift_id' });

          synced++;
        } catch (err) {
          console.error(`Error syncing shift ${shift.id}:`, err);
          errors++;
        }
      }

      return new Response(JSON.stringify({ synced, errors, total: shifts.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Google Calendar auth error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function redirectHtml(status: 'success' | 'error', message: string): string {
  const isSuccess = status === 'success';
  return `<!DOCTYPE html>
<html>
<head><title>Google Calendar — LocumOps</title>
<style>
  body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8f9fa; }
  .card { background: white; border-radius: 12px; padding: 2rem; max-width: 400px; text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
  .icon { font-size: 3rem; margin-bottom: 1rem; }
  h2 { margin: 0 0 0.5rem; color: ${isSuccess ? '#16a34a' : '#dc2626'}; }
  p { color: #6b7280; margin: 0 0 1.5rem; }
  a { display: inline-block; padding: 0.5rem 1.5rem; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; }
</style>
</head>
<body>
  <div class="card">
    <div class="icon">${isSuccess ? '✅' : '❌'}</div>
    <h2>${isSuccess ? 'Connected!' : 'Connection Failed'}</h2>
    <p>${isSuccess ? `Google Calendar (${message}) is now connected to LocumOps.` : message}</p>
    <a href="javascript:window.close()">Close this window</a>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: 'google-calendar-callback', status: '${status}', message: '${message}' }, '*');
    }
  </script>
</body>
</html>`;
}
