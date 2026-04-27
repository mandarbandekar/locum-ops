import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

// Inlined keyword inference (Deno can't import from src/)
const KEYWORDS: Array<{ slug: string; patterns: RegExp[] }> = [
  { slug: 'er',        patterns: [/\b(er|emergency)\b/i] },
  { slug: 'surgery',   patterns: [/\b(surgery|surg|surgical)\b/i] },
  { slug: 'dental',    patterns: [/\b(dental|dentistry)\b/i] },
  { slug: 'wellness',  patterns: [/\b(wellness|vaccine|vaccination|vax)\b/i] },
  { slug: 'oncall',    patterns: [/\b(on[\s-]?call|after[\s-]?hours)\b/i] },
  { slug: 'telemed',   patterns: [/\b(telemed|telehealth|telemedicine|virtual)\b/i] },
  { slug: 'specialty', patterns: [/\b(specialty|specialist|referral)\b/i] },
  { slug: 'shelter',   patterns: [/\b(shelter|nonprofit|non[\s-]?profit|rescue)\b/i] },
  { slug: 'gp',        patterns: [/\b(gp|general\s*practice|general)\b/i] },
];

function inferFromName(name: string | null | undefined): string | undefined {
  if (!name) return undefined;
  for (const { slug, patterns } of KEYWORDS) {
    if (patterns.some(p => p.test(name))) return slug;
  }
  return undefined;
}

interface DefaultRate {
  name: string;
  amount: number;
  basis: 'daily' | 'hourly';
  shift_type?: string;
  active?: boolean;
}

interface CustomRate {
  label?: string;
  amount?: number;
  kind?: 'flat' | 'hourly';
  shift_type?: string;
}

interface TermsSnapshot {
  facility_id: string;
  weekday_rate?: number;
  weekend_rate?: number;
  partial_day_rate?: number;
  holiday_rate?: number;
  telemedicine_rate?: number;
  custom_rates?: CustomRate[];
}

interface ShiftRow {
  id: string;
  facility_id: string;
  rate_applied: number;
  hourly_rate: number | null;
  rate_kind: 'flat' | 'hourly' | null;
}

const PREDEFINED_SLUGS: Record<string, string | undefined> = {
  weekday_rate: undefined,        // ambiguous — leave alone
  weekend_rate: undefined,        // ambiguous
  partial_day_rate: undefined,    // ambiguous
  holiday_rate: undefined,        // ambiguous
  telemedicine_rate: 'telemed',
};

function resolveType(
  shift: ShiftRow,
  terms: TermsSnapshot | undefined,
  defaultRates: DefaultRate[],
): string | undefined {
  const isHourly = shift.rate_kind === 'hourly';
  const shiftAmount = isHourly ? Number(shift.hourly_rate ?? 0) : Number(shift.rate_applied ?? 0);
  if (!shiftAmount || shiftAmount <= 0) return undefined;

  // 1. Match against this facility's custom_rates (carries shift_type directly).
  if (terms?.custom_rates?.length) {
    for (const cr of terms.custom_rates) {
      const crKind = cr.kind === 'hourly' ? 'hourly' : 'flat';
      if (crKind !== (isHourly ? 'hourly' : 'flat')) continue;
      if (Number(cr.amount) !== shiftAmount) continue;
      if (cr.shift_type) return cr.shift_type;
      const inferred = inferFromName(cr.label);
      if (inferred) return inferred;
    }
  }

  // 2. Match against predefined rate slots (only the unambiguous ones).
  if (terms && !isHourly) {
    for (const [key, slug] of Object.entries(PREDEFINED_SLUGS)) {
      if (!slug) continue;
      const v = (terms as Record<string, unknown>)[key];
      if (typeof v === 'number' && v === shiftAmount) return slug;
    }
  }

  // 3. Fall back to the user's Rate Card by amount + basis.
  const basis: 'daily' | 'hourly' = isHourly ? 'hourly' : 'daily';
  const rcMatch = defaultRates.find(
    r => r.active !== false && r.basis === basis && Number(r.amount) === shiftAmount,
  );
  if (rcMatch?.shift_type) return rcMatch.shift_type;
  if (rcMatch?.name) {
    const inferred = inferFromName(rcMatch.name);
    if (inferred) return inferred;
  }

  return undefined;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(
      authHeader.replace('Bearer ', ''),
    );
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claimsData.claims.sub as string;

    // Dry-run support: ?dryRun=1 returns counts without writing.
    const url = new URL(req.url);
    const dryRun = url.searchParams.get('dryRun') === '1';

    // Load profile, terms, and untyped shifts in parallel (RLS scopes by user).
    const [profileRes, termsRes, shiftsRes] = await Promise.all([
      supabase.from('user_profiles').select('default_rates').eq('user_id', userId).maybeSingle(),
      supabase.from('terms_snapshots').select('facility_id, weekday_rate, weekend_rate, partial_day_rate, holiday_rate, telemedicine_rate, custom_rates'),
      supabase.from('shifts').select('id, facility_id, rate_applied, hourly_rate, rate_kind').is('shift_type', null),
    ]);

    if (profileRes.error || termsRes.error || shiftsRes.error) {
      return new Response(JSON.stringify({
        error: 'Failed to load data',
        details: profileRes.error?.message || termsRes.error?.message || shiftsRes.error?.message,
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const defaultRates: DefaultRate[] = (profileRes.data?.default_rates as DefaultRate[]) || [];
    const termsByFacility = new Map<string, TermsSnapshot>();
    for (const t of (termsRes.data || []) as TermsSnapshot[]) {
      // Use the most recent snapshot per facility (last write wins; rows already grouped).
      termsByFacility.set(t.facility_id, t);
    }
    const shifts = (shiftsRes.data || []) as ShiftRow[];

    let updated = 0;
    let skipped = 0;
    const updates: Array<{ id: string; shift_type: string }> = [];

    for (const s of shifts) {
      const slug = resolveType(s, termsByFacility.get(s.facility_id), defaultRates);
      if (slug) updates.push({ id: s.id, shift_type: slug });
      else skipped += 1;
    }

    if (!dryRun && updates.length > 0) {
      // Update one-by-one to respect RLS (PG doesn't support bulk-update with VALUES via PostgREST).
      // Run in batches of 50 with Promise.all for throughput.
      const BATCH = 50;
      for (let i = 0; i < updates.length; i += BATCH) {
        const slice = updates.slice(i, i + BATCH);
        const results = await Promise.all(
          slice.map(u =>
            supabase.from('shifts').update({ shift_type: u.shift_type }).eq('id', u.id),
          ),
        );
        for (const r of results) {
          if (!r.error) updated += 1;
        }
      }
    } else {
      updated = updates.length; // dry-run reports what would be written
    }

    return new Response(
      JSON.stringify({
        scanned: shifts.length,
        updated,
        skipped,
        dryRun,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('backfill-shift-types error:', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
