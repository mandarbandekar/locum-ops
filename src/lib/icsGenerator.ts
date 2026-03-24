/**
 * ICS calendar file generator for LocumOps shifts.
 */

import type { Shift, Facility } from '@/types';

interface IcsEventInput {
  shift: Shift;
  facilityName: string;
  facilityAddress?: string;
  includeAddress?: boolean;
  includeNotes?: boolean;
}

function formatIcsDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function generateUid(shiftId: string): string {
  return `${shiftId}@locumops.app`;
}

export function shiftToIcsEvent(input: IcsEventInput): string {
  const { shift, facilityName, facilityAddress, includeAddress = true, includeNotes = false } = input;
  const lines: string[] = [
    'BEGIN:VEVENT',
    `UID:${generateUid(shift.id)}`,
    `DTSTART:${formatIcsDate(shift.start_datetime)}`,
    `DTEND:${formatIcsDate(shift.end_datetime)}`,
    `SUMMARY:${escapeIcsText(`Relief Shift — ${facilityName}`)}`,
    `DTSTAMP:${formatIcsDate(new Date().toISOString())}`,
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
  lines.push(`DESCRIPTION:${escapeIcsText(descParts.join('\\n'))}`);
  lines.push(`STATUS:${shift.status === 'canceled' ? 'CANCELLED' : 'CONFIRMED'}`);
  lines.push('END:VEVENT');

  return lines.join('\r\n');
}

export function generateIcsCalendar(
  shifts: Shift[],
  facilities: Facility[],
  options: { includeAddress?: boolean; includeNotes?: boolean } = {}
): string {
  const facilityMap = new Map(facilities.map(f => [f.id, f]));

  const events = shifts.map(shift => {
    const facility = facilityMap.get(shift.facility_id);
    return shiftToIcsEvent({
      shift,
      facilityName: facility?.name || 'Unknown Facility',
      facilityAddress: facility?.address,
      includeAddress: options.includeAddress ?? true,
      includeNotes: options.includeNotes ?? false,
    });
  });

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LocumOps//Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:LocumOps Shifts',
    'X-WR-TIMEZONE:UTC',
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
