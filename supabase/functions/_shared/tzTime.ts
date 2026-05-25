// Deno-safe timezone helpers, mirroring src/lib/tzTime.ts.
// Used by edge functions (auto-invoice generation, reminder windowing) so the
// server computes period and "today" boundaries in clinic-local / profile-local
// time instead of UTC midnight.

export interface TzParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export function getPartsInTz(iso: string | Date, timeZone: string): TzParts {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || '0';
  let hour = parseInt(get('hour'), 10);
  if (hour === 24) hour = 0;
  return {
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10),
    day: parseInt(get('day'), 10),
    hour,
    minute: parseInt(get('minute'), 10),
    second: parseInt(get('second'), 10),
  };
}

export function zonedWallClockToUtc(
  dateStr: string, // 'YYYY-MM-DD'
  timeStr: string, // 'HH:mm'
  timeZone: string,
): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  let utcMs = Date.UTC(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0);
  for (let i = 0; i < 2; i++) {
    const p = getPartsInTz(new Date(utcMs), timeZone);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    const offset = asUtc - utcMs;
    utcMs = Date.UTC(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0) - offset;
  }
  return new Date(utcMs);
}

export function localYMDInTz(iso: string | Date, timeZone: string): string {
  const p = getPartsInTz(iso, timeZone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

export type Cadence = 'daily' | 'weekly' | 'biweekly' | 'monthly' | string;

function ymd(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function addDaysYMD(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d, 12, 0, 0) + n * 86400000;
  const dt = new Date(t);
  return ymd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

function startOfWeekYMD(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  return addDaysYMD(dateStr, diff);
}

function startOfMonthYMD(dateStr: string): string {
  const [y, m] = dateStr.split('-').map(Number);
  return ymd(y, m, 1);
}

function endOfMonthYMD(dateStr: string): string {
  const [y, m] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m, 0));
  return ymd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function periodLocalBounds(
  cadence: Cadence,
  refIso: string | Date,
  facilityTz: string,
  anchorDate?: string | null,
): { startYMD: string; endYMD: string } {
  const p = getPartsInTz(refIso, facilityTz);
  const refYMD = ymd(p.year, p.month, p.day);

  switch (cadence) {
    case 'daily':
      return { startYMD: refYMD, endYMD: refYMD };
    case 'weekly': {
      const start = startOfWeekYMD(refYMD);
      return { startYMD: start, endYMD: addDaysYMD(start, 6) };
    }
    case 'biweekly': {
      const anchor = anchorDate || '2026-01-01';
      const [ay, am, ad] = anchor.split('-').map(Number);
      const [ry, rm, rd] = refYMD.split('-').map(Number);
      const aMs = Date.UTC(ay, am - 1, ad, 12);
      const rMs = Date.UTC(ry, rm - 1, rd, 12);
      const daysSince = Math.floor((rMs - aMs) / 86400000);
      const periodNum = Math.floor(daysSince / 14);
      const start = addDaysYMD(anchor, periodNum * 14);
      return { startYMD: start, endYMD: addDaysYMD(start, 13) };
    }
    case 'monthly':
    default:
      return { startYMD: startOfMonthYMD(refYMD), endYMD: endOfMonthYMD(refYMD) };
  }
}

export function periodBoundsUtc(
  cadence: Cadence,
  refIso: string | Date,
  facilityTz: string,
  anchorDate?: string | null,
): { startUtc: Date; endUtcExclusive: Date; startYMD: string; endYMD: string } {
  const { startYMD, endYMD } = periodLocalBounds(cadence, refIso, facilityTz, anchorDate);
  const startUtc = zonedWallClockToUtc(startYMD, '00:00', facilityTz);
  const dayAfterEnd = addDaysYMD(endYMD, 1);
  const endUtcExclusive = zonedWallClockToUtc(dayAfterEnd, '00:00', facilityTz);
  return { startUtc, endUtcExclusive, startYMD, endYMD };
}

export function localYMDForShift(shift: { start_datetime: string; timezone_at_creation?: string | null }, facilityTz: string): string {
  const tz = (shift.timezone_at_creation && shift.timezone_at_creation.trim()) || facilityTz;
  return localYMDInTz(shift.start_datetime, tz);
}
