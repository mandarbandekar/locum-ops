/**
 * ICS calendar file generator for LocumOps shifts.
 *
 * Events are emitted with floating local times tagged by `TZID=<IANA zone>`
 * so calendar clients render the shift in the *clinic's* local time, not the
 * viewer's device timezone. A minimal VTIMEZONE block is included for every
 * unique TZID used in the file (US-zone registry; see `icsTimezones.ts`).
 *
 * Tz resolution order: shift.timezone_at_creation → facility.timezone →
 * profile.timezone → 'America/New_York'. The underlying UTC instant is never
 * re-anchored — we just convert to the clinic's wall-clock for output.
 */

import type { Shift, Facility } from '@/types';
import { getPartsInTz } from '@/lib/tzTime';
import { resolveShiftTz, resolveFacilityTz } from '@/lib/resolveTimezone';
import { vtimezoneBlockFor } from '@/lib/icsTimezones';

interface IcsEventInput {
  shift: Shift;
  facility?: Facility | null;
  facilityName: string;
  facilityAddress?: string;
  profile?: { timezone?: string | null } | null;
  /** Override the resolved tz (escape hatch for tests / non-shift contexts). */
  timezone?: string;
  includeAddress?: boolean;
  includeNotes?: boolean;
}

/** Format a wall-clock instant in `tz` as ICS local date-time: YYYYMMDDTHHMMSS. */
function formatLocalIcsDate(iso: string, tz: string): string {
  const p = getPartsInTz(iso, tz);
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p.year}${pad(p.month)}${pad(p.day)}T${pad(p.hour)}${pad(p.minute)}${pad(p.second)}`;
}

/** Format a UTC instant as ICS basic-format Zulu: YYYYMMDDTHHMMSSZ (for DTSTAMP). */
function formatUtcIcsDate(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function generateUid(shiftId: string): string {
  return `${shiftId}@locumops.app`;
}

export function shiftToIcsEvent(input: IcsEventInput): string {
  const {
    shift, facility, facilityName, facilityAddress, profile, timezone,
    includeAddress = true, includeNotes = false,
  } = input;

  const tz = timezone || resolveShiftTz(shift as any, facility as any, profile as any);
  const dtstart = formatLocalIcsDate(shift.start_datetime, tz);
  const dtend = formatLocalIcsDate(shift.end_datetime, tz);

  const lines: string[] = [
    'BEGIN:VEVENT',
    `UID:${generateUid(shift.id)}`,
    `DTSTART;TZID=${tz}:${dtstart}`,
    `DTEND;TZID=${tz}:${dtend}`,
    `SUMMARY:${escapeIcsText(`Relief Shift — ${facilityName}`)}`,
    `DTSTAMP:${formatUtcIcsDate(new Date().toISOString())}`,
  ];

  if (includeAddress && facilityAddress) {
    lines.push(`LOCATION:${escapeIcsText(facilityAddress)}`);
  }

  const descParts: string[] = [];
  descParts.push(`Facility: ${facilityName}`);
  if (shift.rate_applied > 0) {
    descParts.push(`Rate: $${shift.rate_applied}`);
  }
  if (includeNotes && shift.notes) {
    descParts.push(`Notes: ${shift.notes}`);
  }
  descParts.push('');
  descParts.push('Times shown are clinic local time.');
  descParts.push(`Clinic timezone: ${tz}`);

  lines.push(`DESCRIPTION:${escapeIcsText(descParts.join('\\n'))}`);
  lines.push('STATUS:CONFIRMED');
  lines.push('END:VEVENT');

  return lines.join('\r\n');
}

export function generateIcsCalendar(
  shifts: Shift[],
  facilities: Facility[],
  options: {
    includeAddress?: boolean;
    includeNotes?: boolean;
    profile?: { timezone?: string | null } | null;
  } = {},
): string {
  const facilityMap = new Map(facilities.map(f => [f.id, f]));
  const profile = options.profile ?? null;

  const usedTzs = new Set<string>();
  const events = shifts.map(shift => {
    const facility = facilityMap.get(shift.facility_id) || null;
    const tz = resolveShiftTz(shift as any, facility as any, profile as any);
    usedTzs.add(tz);
    return shiftToIcsEvent({
      shift,
      facility,
      facilityName: facility?.name || 'Unknown Facility',
      facilityAddress: facility?.address,
      profile,
      timezone: tz,
      includeAddress: options.includeAddress ?? true,
      includeNotes: options.includeNotes ?? false,
    });
  });

  // X-WR-TIMEZONE is informational; pick the most common tz or profile fallback.
  const primaryTz = usedTzs.size > 0
    ? Array.from(usedTzs)[0]
    : resolveFacilityTz(null as any, profile as any);

  const vtimezones = Array.from(usedTzs).map(vtimezoneBlockFor);

  const lines = [
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
  ];

  return lines.join('\r\n');
}

export function downloadIcsFile(content: string, filename: string = 'locumops-shifts.ics') {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
