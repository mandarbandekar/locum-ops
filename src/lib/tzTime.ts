// Helpers for rendering datetimes in a specific IANA timezone (e.g. clinic tz)
// instead of the browser's local timezone. Used by the week/day grid so a
// traveling user still sees shifts at their correct clinic-local hours.

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
