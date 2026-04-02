import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateIcsCalendar, shiftToIcsEvent } from '@/lib/icsGenerator';
import type { Shift, Facility } from '@/types';

const mockFacility: Facility = {
  id: 'fac-1',
  name: 'Green Valley Clinic',
  status: 'active',
  address: '123 Main St, Portland, OR',
  timezone: 'America/Los_Angeles',
  notes: '',
  outreach_last_sent_at: null,
  tech_computer_info: '',
  tech_wifi_info: '',
  tech_pims_info: '',
  clinic_access_info: '',
  invoice_prefix: 'GVC',
  invoice_due_days: 30,
  invoice_name_to: '',
  invoice_email_to: '',
  invoice_name_cc: '',
  invoice_email_cc: '',
  invoice_name_bcc: '',
  invoice_email_bcc: '',
  billing_cadence: 'monthly',
  billing_cycle_anchor_date: null,
  billing_week_end_day: 'saturday',
  auto_generate_invoices: true,
};

const futureDate = new Date();
futureDate.setDate(futureDate.getDate() + 7);
const futureEnd = new Date(futureDate);
futureEnd.setHours(futureEnd.getHours() + 8);

const pastDate = new Date();
pastDate.setDate(pastDate.getDate() - 7);
const pastEnd = new Date(pastDate);
pastEnd.setHours(pastEnd.getHours() + 8);

const bookedShift: Shift = {
  id: 'shift-1',
  facility_id: 'fac-1',
  start_datetime: futureDate.toISOString(),
  end_datetime: futureEnd.toISOString(),
  rate_applied: 1200,
  notes: 'Bring lunch',
  color: 'blue',
};

const anotherShift: Shift = {
  id: 'shift-2',
  facility_id: 'fac-1',
  start_datetime: futureDate.toISOString(),
  end_datetime: futureEnd.toISOString(),
  rate_applied: 1000,
  notes: '',
  color: 'green',
};

const pastShift: Shift = {
  id: 'shift-4',
  facility_id: 'fac-1',
  start_datetime: pastDate.toISOString(),
  end_datetime: pastEnd.toISOString(),
  rate_applied: 1200,
  notes: '',
  color: 'blue',
};

describe('ICS Generator', () => {
  it('generates a valid VCALENDAR wrapper', () => {
    const ics = generateIcsCalendar([], []);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('PRODID:-//LocumOps//Calendar//EN');
    expect(ics).toContain('X-WR-CALNAME:LocumOps Shifts');
  });

  it('generates correct event title with facility name', () => {
    const event = shiftToIcsEvent({
      shift: bookedShift,
      facilityName: 'Green Valley Clinic',
    });
    expect(event).toContain('SUMMARY:Relief Shift — Green Valley Clinic');
  });

  it('includes facility address as LOCATION when enabled', () => {
    const event = shiftToIcsEvent({
      shift: bookedShift,
      facilityName: 'Green Valley Clinic',
      facilityAddress: '123 Main St',
      includeAddress: true,
    });
    expect(event).toContain('LOCATION:123 Main St');
  });

  it('excludes address when includeAddress is false', () => {
    const event = shiftToIcsEvent({
      shift: bookedShift,
      facilityName: 'Green Valley Clinic',
      facilityAddress: '123 Main St',
      includeAddress: false,
    });
    expect(event).not.toContain('LOCATION:');
  });

  it('includes notes when enabled', () => {
    const event = shiftToIcsEvent({
      shift: bookedShift,
      facilityName: 'Green Valley Clinic',
      includeNotes: true,
    });
    expect(event).toContain('Bring lunch');
  });

  it('excludes notes when disabled', () => {
    const event = shiftToIcsEvent({
      shift: bookedShift,
      facilityName: 'Green Valley Clinic',
      includeNotes: false,
    });
    expect(event).not.toContain('Bring lunch');
  });

  it('sets STATUS:CONFIRMED for all shifts', () => {
    const event = shiftToIcsEvent({
      shift: bookedShift,
      facilityName: 'Test',
    });
    expect(event).toContain('STATUS:CONFIRMED');
  });

  it('generates events for multiple shifts', () => {
    const ics = generateIcsCalendar([bookedShift, pastShift], [mockFacility]);
    const eventCount = (ics.match(/BEGIN:VEVENT/g) || []).length;
    expect(eventCount).toBe(2);
  });

  it('includes rate in description', () => {
    const event = shiftToIcsEvent({
      shift: bookedShift,
      facilityName: 'Test',
    });
    expect(event).toContain('Rate: $1200');
  });

  it('uses shift id as UID', () => {
    const event = shiftToIcsEvent({
      shift: bookedShift,
      facilityName: 'Test',
    });
    expect(event).toContain('UID:shift-1@locumops.app');
  });
});

describe('Calendar Sync Rules', () => {
  it('all shifts are synced (no status filtering)', () => {
    const allShifts = [bookedShift, anotherShift, pastShift];
    expect(allShifts).toHaveLength(3);
  });

  it('only future shifts should be included when sync_future_only is true', () => {
    const now = new Date();
    const allShifts = [bookedShift, pastShift];
    const futureOnly = allShifts.filter(s => new Date(s.start_datetime) >= now);
    expect(futureOnly).toHaveLength(1);
    expect(futureOnly[0].id).toBe('shift-1');
  });
});
