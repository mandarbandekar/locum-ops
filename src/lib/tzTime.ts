// Helpers for rendering datetimes in a specific IANA timezone (e.g. clinic tz)
// instead of the browser's local timezone. Used by the week/day grid so a
// traveling user still sees shifts at their correct clinic-local hours.
import { format as dfFormat } from 'date-fns';

function getParts(iso: string | Date, timeZone: string) {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const get = (t: string) => parts.find(p => p.type === t)?.value || '0';
  let hour = parseInt(get('hour'), 10);
  // Intl can return "24" for midnight in some runtimes — normalize.
  if (hour === 24) hour = 0;
  return {
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10), // 1-12
    day: parseInt(get('day'), 10),
    hour,
    minute: parseInt(get('minute'), 10),
    second: parseInt(get('second'), 10),
  };
}

export function getHoursInTz(iso: string | Date, timeZone: string): number {
  return getParts(iso, timeZone).hour;
}

export function getMinutesInTz(iso: string | Date, timeZone: string): number {
  return getParts(iso, timeZone).minute;
}

/** True if the given instant falls on the same calendar day as `day` when both
 *  are evaluated in `timeZone`. `day` is treated as a wall-clock date. */
export function isSameDayInTz(iso: string | Date, day: Date, timeZone: string): boolean {
  const a = getParts(iso, timeZone);
  // For `day`, use its plain Y/M/D — it's a calendar marker, not an instant.
  return a.year === day.getFullYear() && a.month === day.getMonth() + 1 && a.day === day.getDate();
}

/** Format hh:mm a in the given tz, e.g. "8:20 AM". */
export function formatTimeInTz(iso: string | Date, timeZone: string): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

/** Format HH:mm (24h, zero-padded) in the given tz, e.g. "08:20". */
export function formatHHMMInTz(iso: string | Date, timeZone: string): string {
  const p = getPartsInTz(iso, timeZone);
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

/** Format YYYY-MM-DD in the given tz, e.g. "2026-05-27". */
export function formatYMDInTz(iso: string | Date, timeZone: string): string {
  const p = getPartsInTz(iso, timeZone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** Year (number) of the instant when observed in `timeZone`. */
export function getYearInTz(iso: string | Date, timeZone: string): number {
  return getPartsInTz(iso, timeZone).year;
}

/** Format an instant as a calendar date *in `timeZone`* using a date-fns
 *  pattern. Internally we read the wall-clock parts in tz, build a UTC Date
 *  with those parts, and format with `formatInUtc` so date-fns sees the
 *  intended Y/M/D/H/M without re-applying the browser offset. */
export function formatDateInTz(iso: string | Date, timeZone: string, pattern: string): string {
  const p = getPartsInTz(iso, timeZone);
  // Construct a Date whose *local* wall-clock matches the tz-observed parts.
  const local = new Date(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return dfFormat(local, pattern);
}

// Exposed wrapper around the internal getParts so other modules can read the
// full wall-clock breakdown in a given tz without re-implementing it.
export function getPartsInTz(iso: string | Date, timeZone: string) {
  // Defer to the internal helper at the top of this file.
  return _getParts(iso, timeZone);
}

// Re-export the private helper above via a local alias so we don't change its
// scope. (Top-of-file `getParts` is still the source of truth.)
const _getParts = (iso: string | Date, timeZone: string) => {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const get = (t: string) => parts.find(p => p.type === t)?.value || '0';
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
};

/**
 * Build a UTC Date representing the given wall-clock time *as observed in
 * `timeZone`*. E.g. ("2026-05-27", "08:00", "America/Los_Angeles") returns
 * the instant that displays as May 27, 8:00 AM in Los Angeles — regardless
 * of the browser's local timezone.
 *
 * Works correctly across DST by iterating once on the offset.
 */
export function zonedWallClockToUtc(
  dateStr: string, // 'YYYY-MM-DD'
  timeStr: string, // 'HH:mm'
  timeZone: string,
): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  // First approximation: pretend the wall clock is UTC.
  let utcMs = Date.UTC(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0);
  // Read what `timeZone` thinks this instant is, compute the offset, adjust.
  for (let i = 0; i < 2; i++) {
    const p = _getParts(new Date(utcMs), timeZone);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    const offset = asUtc - utcMs; // ms east of UTC for this instant
    utcMs = Date.UTC(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0) - offset;
  }
  return new Date(utcMs);
}

/**
 * Parse a date-only `YYYY-MM-DD` string as a Date at local midnight, avoiding
 * the `new Date('2026-06-15')` trap (that parses as UTC midnight and shifts
 * to the previous calendar day for any tz west of UTC).
 *
 * Use this for date-only columns: invoice due_date, credential expiration_date,
 * contract effective_date/end_date, expense_date.
 *
 * Returns null for null/empty/invalid input.
 */
export function parseDateOnly(ymd: string | null | undefined): Date | null {
  if (!ymd) return null;
  const s = String(ymd).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  if (!y || !mo || !d) return null;
  return new Date(y, mo - 1, d);
}

/**
 * Days between `ymd` (date-only) and today, both interpreted as local-midnight
 * calendar dates. Positive = future, negative = past, 0 = today.
 */
export function daysUntilDateOnly(ymd: string | null | undefined): number | null {
  const d = parseDateOnly(ymd);
  if (!d) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}
