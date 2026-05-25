/**
 * Minimal VTIMEZONE registry for US IANA timezones. Emitted alongside
 * `DTSTART;TZID=...` so calendar clients with strict VTIMEZONE parsing
 * (some Outlook variants) still resolve the offset correctly. Apple Calendar
 * and Google Calendar primarily key off the TZID string itself, so the
 * VTIMEZONE block is defensive — not the source of truth.
 *
 * US-only scope matches the project's regional restriction (timezones are
 * picked from a US-only list elsewhere). Non-US TZIDs fall back to America/
 * New_York's VTIMEZONE block to avoid emitting unknown zones with no fallback.
 */

export const US_VTIMEZONE_BLOCKS: Record<string, string> = {
  'America/Los_Angeles': [
    'BEGIN:VTIMEZONE',
    'TZID:America/Los_Angeles',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:-0800',
    'TZOFFSETTO:-0700',
    'TZNAME:PDT',
    'DTSTART:19700308T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:-0700',
    'TZOFFSETTO:-0800',
    'TZNAME:PST',
    'DTSTART:19701101T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
    'END:STANDARD',
    'END:VTIMEZONE',
  ].join('\r\n'),
  'America/Denver': [
    'BEGIN:VTIMEZONE',
    'TZID:America/Denver',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:-0700',
    'TZOFFSETTO:-0600',
    'TZNAME:MDT',
    'DTSTART:19700308T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:-0600',
    'TZOFFSETTO:-0700',
    'TZNAME:MST',
    'DTSTART:19701101T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
    'END:STANDARD',
    'END:VTIMEZONE',
  ].join('\r\n'),
  'America/Chicago': [
    'BEGIN:VTIMEZONE',
    'TZID:America/Chicago',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:-0600',
    'TZOFFSETTO:-0500',
    'TZNAME:CDT',
    'DTSTART:19700308T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:-0500',
    'TZOFFSETTO:-0600',
    'TZNAME:CST',
    'DTSTART:19701101T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
    'END:STANDARD',
    'END:VTIMEZONE',
  ].join('\r\n'),
  'America/New_York': [
    'BEGIN:VTIMEZONE',
    'TZID:America/New_York',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:-0500',
    'TZOFFSETTO:-0400',
    'TZNAME:EDT',
    'DTSTART:19700308T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:-0400',
    'TZOFFSETTO:-0500',
    'TZNAME:EST',
    'DTSTART:19701101T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
    'END:STANDARD',
    'END:VTIMEZONE',
  ].join('\r\n'),
  'America/Anchorage': [
    'BEGIN:VTIMEZONE',
    'TZID:America/Anchorage',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:-0900',
    'TZOFFSETTO:-0800',
    'TZNAME:AKDT',
    'DTSTART:19700308T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:-0800',
    'TZOFFSETTO:-0900',
    'TZNAME:AKST',
    'DTSTART:19701101T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
    'END:STANDARD',
    'END:VTIMEZONE',
  ].join('\r\n'),
  // Non-DST zones
  'America/Phoenix': [
    'BEGIN:VTIMEZONE',
    'TZID:America/Phoenix',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:-0700',
    'TZOFFSETTO:-0700',
    'TZNAME:MST',
    'DTSTART:19700101T000000',
    'END:STANDARD',
    'END:VTIMEZONE',
  ].join('\r\n'),
  'Pacific/Honolulu': [
    'BEGIN:VTIMEZONE',
    'TZID:Pacific/Honolulu',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:-1000',
    'TZOFFSETTO:-1000',
    'TZNAME:HST',
    'DTSTART:19700101T000000',
    'END:STANDARD',
    'END:VTIMEZONE',
  ].join('\r\n'),
};

/** Return a VTIMEZONE block for the given IANA tz, falling back to ET. */
export function vtimezoneBlockFor(tz: string): string {
  return US_VTIMEZONE_BLOCKS[tz] || US_VTIMEZONE_BLOCKS['America/New_York'];
}
