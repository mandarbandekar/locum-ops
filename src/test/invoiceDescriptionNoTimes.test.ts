// Regression guard: invoice line item descriptions must never include shift
// start/end times. Times belong in the service_date / shift context, not the
// human-facing line text on the invoice. If a future change reintroduces a
// time fragment (e.g. "8:00 AM - 6:00 PM") into the description, this test
// will fail loudly.

import { describe, it, expect } from 'vitest';
import { buildAutoInvoiceDraft } from '@/lib/invoiceAutoGeneration';
import type { Shift, Facility } from '@/types';

const facility: Facility = {
  id: 'f1', name: 'Test Clinic', status: 'active', address: '',
  timezone: 'America/Los_Angeles', notes: '', outreach_last_sent_at: null,
  tech_computer_info: '', tech_wifi_info: '', tech_pims_info: '',
  clinic_access_info: '', invoice_prefix: 'TST', invoice_due_days: 15,
  invoice_name_to: 'Billing', invoice_email_to: 'billing@test.com',
  invoice_name_cc: '', invoice_email_cc: '', invoice_name_bcc: '',
  invoice_email_bcc: '', billing_cadence: 'monthly',
  billing_cycle_anchor_date: null, billing_week_end_day: 'saturday',
  auto_generate_invoices: true,
} as Facility;

const makeShift = (overrides: Partial<Shift>): Shift => ({
  id: 's', facility_id: 'f1',
  start_datetime: '2026-05-04T15:00:00.000Z', // 08:00 PT
  end_datetime:   '2026-05-05T01:00:00.000Z', // 18:00 PT
  rate_applied: 850, notes: '', color: 'blue',
  ...overrides,
} as Shift);

// Anything that looks like a clock time, a time range, or a 12h marker.
// Catches: "08:00", "8:00 AM", "8 AM", "08:00-18:00", "8:00 to 18:00",
// "8:00 AM – 6:00 PM" (en/em dashes), "20:00".
const TIME_LIKE = [
  /\b\d{1,2}:\d{2}\b/,                 // 8:00 / 08:00
  /\b\d{1,2}\s?(am|pm)\b/i,            // 8 AM / 8pm
  /\d{1,2}:\d{2}\s?(am|pm)/i,          // 8:00 AM
  /\b\d{1,2}\s?[-–—to]+\s?\d{1,2}\b/i, // 8-18 / 8 to 18 / 8 – 6
];

function assertNoTimes(description: string) {
  for (const re of TIME_LIKE) {
    expect(
      re.test(description),
      `Description "${description}" matched time-like pattern ${re}`,
    ).toBe(false);
  }
}

describe('invoice line items never include shift times in description', () => {
  const periodStart = new Date('2026-05-01T00:00:00.000Z');
  const periodEnd = new Date('2026-05-31T23:59:59.000Z');

  it('flat daily shift', () => {
    const { lineItems } = buildAutoInvoiceDraft(
      facility, [makeShift({ id: 's-flat' })], periodStart, periodEnd, 'TST-2026-001',
    );
    expect(lineItems.length).toBeGreaterThan(0);
    for (const li of lineItems) assertNoTimes(li.description);
  });

  it('hourly shift', () => {
    const { lineItems } = buildAutoInvoiceDraft(
      facility,
      [makeShift({ id: 's-hr', rate_kind: 'hourly', hourly_rate: 95 } as Partial<Shift>)],
      periodStart, periodEnd, 'TST-2026-002',
    );
    expect(lineItems.length).toBeGreaterThan(0);
    for (const li of lineItems) assertNoTimes(li.description);
  });

  it('shift with unpaid break suffix', () => {
    const { lineItems } = buildAutoInvoiceDraft(
      facility,
      [makeShift({ id: 's-brk', break_minutes: 30, worked_through_break: false } as Partial<Shift>)],
      periodStart, periodEnd, 'TST-2026-003',
    );
    expect(lineItems.length).toBeGreaterThan(0);
    for (const li of lineItems) assertNoTimes(li.description);
  });

  it('shift with overtime line', () => {
    const { lineItems } = buildAutoInvoiceDraft(
      facility,
      [makeShift({ id: 's-ot', overtime_hours: 2, overtime_rate: 120 } as Partial<Shift>)],
      periodStart, periodEnd, 'TST-2026-004',
    );
    // Expect base + overtime
    expect(lineItems.length).toBe(2);
    for (const li of lineItems) assertNoTimes(li.description);
  });

  it('mix of all the above in one invoice', () => {
    const { lineItems } = buildAutoInvoiceDraft(
      facility,
      [
        makeShift({ id: 'a' }),
        makeShift({ id: 'b', rate_kind: 'hourly', hourly_rate: 110 } as Partial<Shift>),
        makeShift({ id: 'c', break_minutes: 60, worked_through_break: false, overtime_hours: 1.5, overtime_rate: 100 } as Partial<Shift>),
      ],
      periodStart, periodEnd, 'TST-2026-005',
    );
    expect(lineItems.length).toBeGreaterThanOrEqual(3);
    for (const li of lineItems) assertNoTimes(li.description);
  });
});
