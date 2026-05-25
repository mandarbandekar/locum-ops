/**
 * ICS timezone-labeling tests for the V1 calendar timezone hardening.
 *
 * Ensures shift events emit `DTSTART;TZID=<IANA>` using the clinic's tz,
 * preserve the underlying instant, include a VTIMEZONE block per zone, and
 * surface the clinic-tz disclosure in the event description.
 */

import { describe, it, expect } from 'vitest';
import { generateIcsCalendar, shiftToIcsEvent } from '@/lib/icsGenerator';
import type { Shift, Facility } from '@/types';

const baseFacility = (overrides: Partial<Facility> = {}): Facility => ({
  id: 'fac-1', name: 'Test Clinic', status: 'active',
  address: '1 Main St', timezone: 'America/Los_Angeles',
  notes: '', outreach_last_sent_at: null,
  tech_computer_info: '', tech_wifi_info: '', tech_pims_info: '',
  clinic_access_info: '', invoice_prefix: 'TC', invoice_due_days: 30,
  invoice_name_to: '', invoice_email_to: '',
  invoice_name_cc: '', invoice_email_cc: '',
  invoice_name_bcc: '', invoice_email_bcc: '',
  billing_cadence: 'monthly', billing_cycle_anchor_date: null,
  billing_week_end_day: 'saturday', auto_generate_invoices: true,
  ...overrides,
} as Facility);

const makeShift = (overrides: Partial<Shift> = {}): Shift => ({
  id: 's-1', facility_id: 'fac-1',
  start_datetime: '2026-06-01T05:00:00.000Z',
  end_datetime: '2026-06-01T13:00:00.000Z',
  rate_applied: 800, notes: '', color: 'blue',
  ...overrides,
} as Shift);

describe('ICS timezone labeling', () => {
  it('California clinic emits DTSTART;TZID=America/Los_Angeles', () => {
    const fac = baseFacility({ timezone: 'America/Los_Angeles' });
    // 8 AM PDT (Jun 1) = 15:00 UTC
    const shift = makeShift({
      start_datetime: '2026-06-01T15:00:00.000Z',
      end_datetime: '2026-06-02T01:00:00.000Z', // 6 PM PDT
    });
    const ev = shiftToIcsEvent({ shift, facility: fac, facilityName: fac.name });
    expect(ev).toContain('DTSTART;TZID=America/Los_Angeles:20260601T080000');
    expect(ev).toContain('DTEND;TZID=America/Los_Angeles:20260601T180000');
  });

  it('Arizona clinic emits DTSTART;TZID=America/Phoenix (no DST)', () => {
    const fac = baseFacility({ id: 'az', timezone: 'America/Phoenix' });
    // 9 AM MST = 16:00 UTC (Phoenix is UTC-7 year-round)
    const shift = makeShift({
      facility_id: 'az',
      start_datetime: '2026-06-15T16:00:00.000Z',
      end_datetime: '2026-06-16T00:00:00.000Z',
    });
    const ev = shiftToIcsEvent({ shift, facility: fac, facilityName: fac.name });
    expect(ev).toContain('DTSTART;TZID=America/Phoenix:20260615T090000');
    expect(ev).toContain('DTEND;TZID=America/Phoenix:20260615T170000');
  });

  it('overnight shift keeps local wall-clock dates across midnight', () => {
    const fac = baseFacility({ timezone: 'America/Los_Angeles' });
    // 22:00 LA May 31 (= 05:00 UTC Jun 1) → 06:00 LA Jun 1 (= 13:00 UTC Jun 1)
    const shift = makeShift({
      start_datetime: '2026-06-01T05:00:00.000Z',
      end_datetime: '2026-06-01T13:00:00.000Z',
    });
    const ev = shiftToIcsEvent({ shift, facility: fac, facilityName: fac.name });
    expect(ev).toContain('DTSTART;TZID=America/Los_Angeles:20260531T220000');
    expect(ev).toContain('DTEND;TZID=America/Los_Angeles:20260601T060000');
  });

  it('DST spring-forward day keeps local wall-clock time correct', () => {
    // March 8 2026 is the US spring-forward Sunday. A shift starting at
    // 9 AM PDT = 16:00 UTC (post-transition). It should render 09:00 local.
    const fac = baseFacility({ timezone: 'America/Los_Angeles' });
    const shift = makeShift({
      start_datetime: '2026-03-08T16:00:00.000Z',
      end_datetime: '2026-03-09T01:00:00.000Z',
    });
    const ev = shiftToIcsEvent({ shift, facility: fac, facilityName: fac.name });
    expect(ev).toContain('DTSTART;TZID=America/Los_Angeles:20260308T090000');
    expect(ev).toContain('DTEND;TZID=America/Los_Angeles:20260308T180000');
  });

  it('event description includes clinic timezone disclosure', () => {
    const fac = baseFacility({ timezone: 'America/Chicago' });
    const shift = makeShift({});
    const ev = shiftToIcsEvent({ shift, facility: fac, facilityName: fac.name });
    expect(ev).toContain('Times shown are clinic local time.');
    expect(ev).toContain('Clinic timezone: America/Chicago');
  });

  it('tz resolution prefers shift snapshot over facility timezone', () => {
    // Snapshot says Chicago even though facility now reads NY (clinic edited tz).
    const fac = baseFacility({ timezone: 'America/New_York' });
    const shift = makeShift({
      timezone_at_creation: 'America/Chicago',
      // 9 AM CDT = 14:00 UTC (mid-summer)
      start_datetime: '2026-07-10T14:00:00.000Z',
      end_datetime: '2026-07-10T22:00:00.000Z',
    } as any);
    const ev = shiftToIcsEvent({ shift, facility: fac, facilityName: fac.name });
    expect(ev).toContain('DTSTART;TZID=America/Chicago:20260710T090000');
    expect(ev).toContain('Clinic timezone: America/Chicago');
  });

  it('tz resolution falls through to profile when facility tz is missing', () => {
    const fac = baseFacility({ timezone: '' as any });
    const shift = makeShift({});
    const ev = shiftToIcsEvent({
      shift, facility: fac, facilityName: fac.name,
      profile: { timezone: 'America/Denver' },
    });
    expect(ev).toContain('TZID=America/Denver');
  });

  it('tz resolution falls back to America/New_York when nothing is set', () => {
    const fac = baseFacility({ timezone: '' as any });
    const shift = makeShift({});
    const ev = shiftToIcsEvent({
      shift, facility: fac, facilityName: fac.name, profile: null,
    });
    expect(ev).toContain('TZID=America/New_York');
  });

  it('calendar includes a VTIMEZONE block for each unique zone used', () => {
    const facLA = baseFacility({ id: 'la', timezone: 'America/Los_Angeles' });
    const facAZ = baseFacility({ id: 'az', name: 'AZ Clinic', timezone: 'America/Phoenix' });
    const shifts = [
      makeShift({ id: 's-la', facility_id: 'la' }),
      makeShift({ id: 's-az', facility_id: 'az' }),
    ];
    const ics = generateIcsCalendar(shifts, [facLA, facAZ]);
    expect(ics).toContain('BEGIN:VTIMEZONE\r\nTZID:America/Los_Angeles');
    expect(ics).toContain('BEGIN:VTIMEZONE\r\nTZID:America/Phoenix');
    // RRULE only present for DST zones
    const laBlock = ics.split('BEGIN:VTIMEZONE\r\nTZID:America/Los_Angeles')[1].split('END:VTIMEZONE')[0];
    expect(laBlock).toContain('RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU');
    const azBlock = ics.split('BEGIN:VTIMEZONE\r\nTZID:America/Phoenix')[1].split('END:VTIMEZONE')[0];
    expect(azBlock).not.toContain('RRULE');
  });

  it('underlying instant is preserved across timezones', () => {
    // Same UTC instant rendered in two zones should produce different local
    // wall-clock strings but each should round-trip back to the same UTC.
    const fac = baseFacility({ timezone: 'America/Los_Angeles' });
    const shift = makeShift({
      start_datetime: '2026-06-01T15:00:00.000Z',
      end_datetime: '2026-06-01T23:00:00.000Z',
    });
    const ev = shiftToIcsEvent({ shift, facility: fac, facilityName: fac.name });
    // 15:00 UTC == 08:00 PDT
    expect(ev).toContain('DTSTART;TZID=America/Los_Angeles:20260601T080000');
    // 23:00 UTC == 16:00 PDT
    expect(ev).toContain('DTEND;TZID=America/Los_Angeles:20260601T160000');
  });
});
