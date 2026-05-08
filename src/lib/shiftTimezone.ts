import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';

/**
 * Returns the user's current device timezone (IANA), e.g. 'America/Chicago'.
 * Falls back to 'UTC' if the browser doesn't expose Intl.
 */
export function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Short timezone abbreviation for a given IANA zone at a given moment
 * (handles DST). E.g. 'America/New_York' on a summer date → 'EDT'.
 */
export function getTimezoneAbbr(tz: string, when: Date | string = new Date()): string {
  try {
    const d = typeof when === 'string' ? new Date(when) : when;
    return formatInTimeZone(d, tz, 'zzz');
  } catch {
    return '';
  }
}

/**
 * Render a stored ISO datetime in the clinic's timezone using a date-fns
 * format string. Use this instead of date-fns `format(new Date(iso), …)`
 * for any shift-related display.
 */
export function formatInClinicTz(iso: string, clinicTz: string, fmt: string): string {
  if (!clinicTz) return formatInTimeZone(new Date(iso), getDeviceTimezone(), fmt);
  return formatInTimeZone(new Date(iso), clinicTz, fmt);
}

/**
 * For a stored shift datetime, return the absolute UTC range in ms.
 * The datetime is interpreted as **clinic-local wall clock** when a clinic
 * timezone is provided. This is what powers timezone-aware conflict math.
 *
 * If `clinicTz` is omitted, behaves like the legacy `new Date(iso)` semantics
 * (browser-local interpretation of the wall clock).
 */
export function getShiftAbsoluteRange(
  shift: { start_datetime: string; end_datetime: string },
  clinicTz?: string | null,
): { startUtcMs: number; endUtcMs: number } {
  if (!clinicTz) {
    return {
      startUtcMs: new Date(shift.start_datetime).getTime(),
      endUtcMs: new Date(shift.end_datetime).getTime(),
    };
  }
  // Strip any trailing zone designator from the stored ISO so we treat the
  // wall-clock components as clinic-local. Stored values may be either
  // 'YYYY-MM-DDTHH:mm:ss' or 'YYYY-MM-DDTHH:mm:ss.sssZ'; both shapes carry
  // the wall clock we want, the suffix just changes how `new Date()` reads it.
  const wallClock = stripZone(shift.start_datetime);
  const wallEnd = stripZone(shift.end_datetime);
  return {
    startUtcMs: fromZonedTime(wallClock, clinicTz).getTime(),
    endUtcMs: fromZonedTime(wallEnd, clinicTz).getTime(),
  };
}

function stripZone(iso: string): string {
  // Remove trailing Z or ±HH:mm so the date string is interpreted as a
  // floating wall clock by date-fns-tz#fromZonedTime.
  return iso.replace(/(?:Z|[+-]\d{2}:?\d{2})$/, '');
}

/**
 * Compose a stored ISO from a YYYY-MM-DD date + HH:mm time in the clinic's
 * timezone. End rolls to next day when ≤ start (overnight).
 */
export function buildShiftIso(
  dateYmd: string,
  startHm: string,
  endHm: string,
  clinicTz?: string | null,
): { startIso: string; endIso: string } {
  const startWall = `${dateYmd}T${startHm}:00`;
  let endWall = `${dateYmd}T${endHm}:00`;
  const startMinutes = hmToMinutes(startHm);
  const endMinutes = hmToMinutes(endHm);
  if (endMinutes <= startMinutes) {
    // Roll the YMD by one day.
    const [y, m, d] = dateYmd.split('-').map(Number);
    const next = new Date(Date.UTC(y, m - 1, d + 1));
    const nextYmd = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
    endWall = `${nextYmd}T${endHm}:00`;
  }
  if (clinicTz) {
    return {
      startIso: fromZonedTime(startWall, clinicTz).toISOString(),
      endIso: fromZonedTime(endWall, clinicTz).toISOString(),
    };
  }
  // Legacy: interpret as browser-local
  return {
    startIso: new Date(startWall).toISOString(),
    endIso: new Date(endWall).toISOString(),
  };
}

function hmToMinutes(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Display helper: returns the shift's clinic-local time, the tz abbr, and
 * an optional secondary "your time" line when the device timezone differs.
 */
export function getShiftDisplay(
  shift: { start_datetime: string; end_datetime: string },
  clinicTz: string | undefined | null,
  deviceTz: string = getDeviceTimezone(),
): {
  primaryStart: string;
  primaryEnd: string;
  tzAbbr: string;
  secondary: string | null;
} {
  const tz = clinicTz || deviceTz;
  const primaryStart = formatInTimeZone(new Date(shift.start_datetime), tz, 'h:mm a');
  const primaryEnd = formatInTimeZone(new Date(shift.end_datetime), tz, 'h:mm a');
  const tzAbbr = getTimezoneAbbr(tz, shift.start_datetime);

  let secondary: string | null = null;
  if (clinicTz && deviceTz && clinicTz !== deviceTz) {
    const localStart = formatInTimeZone(new Date(shift.start_datetime), deviceTz, 'h:mm a');
    const localEnd = formatInTimeZone(new Date(shift.end_datetime), deviceTz, 'h:mm a');
    const localAbbr = getTimezoneAbbr(deviceTz, shift.start_datetime);
    secondary = `${localStart} – ${localEnd} ${localAbbr} your time`;
  }

  return { primaryStart, primaryEnd, tzAbbr, secondary };
}
