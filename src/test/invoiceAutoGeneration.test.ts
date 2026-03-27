import { describe, it, expect } from 'vitest';
import {
  isShiftInvoiceEligible,
  getBillingPeriod,
  getEligibleShiftsForPeriod,
  getInvoicedShiftIds,
  buildAutoInvoiceDraft,
  getGenerationTriggerDate,
  shouldGenerateDraft,
  getSentInvoiceShiftIds,
  canSendInvoice,
} from '@/lib/invoiceAutoGeneration';
import { SYSTEM_RUN_HOUR } from '@/lib/invoiceAutoGeneration';
import { getDefaultBillingConfig, DEFAULT_BILLING_WEEK_END_DAY, validateSenderProfile, hasBillingContact } from '@/lib/invoiceBillingDefaults';
import type { Shift, Invoice, InvoiceLineItem, Facility } from '@/types';

const makeShift = (id: string, facilityId: string, status: string, dateStr: string, startHour = 8, endHour = 18): Shift => {
  const start = new Date(dateStr);
  start.setHours(startHour, 0, 0, 0);
  const end = new Date(dateStr);
  end.setHours(endHour, 0, 0, 0);
  return {
    id, facility_id: facilityId, status: status as any,
    start_datetime: start.toISOString(),
    end_datetime: end.toISOString(),
    rate_applied: 850, notes: '', color: 'blue',
  };
};

const makeFacility = (overrides?: Partial<Facility>): Facility => ({
  id: 'f1', name: 'Test Clinic', status: 'active', address: '', timezone: 'America/Los_Angeles',
  notes: '', outreach_last_sent_at: null, tech_computer_info: '', tech_wifi_info: '',
  tech_pims_info: '', clinic_access_info: '', invoice_prefix: 'TST', invoice_due_days: 15,
  invoice_name_to: 'Billing Dept', invoice_email_to: 'billing@test.com',
  invoice_name_cc: '', invoice_email_cc: '', invoice_name_bcc: '', invoice_email_bcc: '',
  billing_cadence: 'monthly', billing_cycle_anchor_date: null,
  billing_week_end_day: 'saturday', auto_generate_invoices: true,
  ...overrides,
});

describe('Invoice Auto-Generation (New Rules)', () => {
  // 1) Daily invoices generate on the morning of the shift date
  it('daily: billing period is the shift date itself', () => {
    const ref = new Date('2026-03-10T08:00:00');
    const { start, end } = getBillingPeriod('daily', ref);
    expect(start.getDate()).toBe(10);
    expect(end.getDate()).toBe(10);
  });

  it('daily: triggers during early morning system run on the shift date', () => {
    const shifts = [makeShift('s1', 'f1', 'booked', '2026-03-10')];
    const triggerDate = getGenerationTriggerDate(shifts, 'daily');
    expect(triggerDate).not.toBeNull();
    expect(triggerDate!.getDate()).toBe(10);
    expect(triggerDate!.getHours()).toBe(SYSTEM_RUN_HOUR);

    // Should NOT generate before system run hour
    expect(shouldGenerateDraft(shifts, 'daily', new Date('2026-03-10T04:00:00'))).toBe(false);
    // Should generate at system run hour
    expect(shouldGenerateDraft(shifts, 'daily', new Date(`2026-03-10T0${SYSTEM_RUN_HOUR}:00:00`))).toBe(true);
  });

  // 2) Weekly invoices generate on the morning of the last scheduled shift in Mon-Sun week
  it('weekly: billing period is Monday through Sunday', () => {
    // March 11, 2026 is a Wednesday
    const ref = new Date('2026-03-11T10:00:00');
    const { start, end } = getBillingPeriod('weekly', ref);
    expect(start.getDay()).toBe(1); // Monday
    expect(end.getDay()).toBe(0); // Sunday
  });

  it('weekly: triggers during early morning system run on the last scheduled shift day', () => {
    const shifts = [
      makeShift('s1', 'f1', 'booked', '2026-03-10'), // Tuesday
      makeShift('s2', 'f1', 'booked', '2026-03-12'), // Thursday
      makeShift('s3', 'f1', 'booked', '2026-03-14'), // Saturday
    ];
    const triggerDate = getGenerationTriggerDate(shifts, 'weekly');
    expect(triggerDate!.getDate()).toBe(14); // Saturday, the last shift
    expect(triggerDate!.getHours()).toBe(SYSTEM_RUN_HOUR);

    // Should NOT generate before Saturday system run
    expect(shouldGenerateDraft(shifts, 'weekly', new Date('2026-03-14T04:00:00'))).toBe(false);
    // Should generate at Saturday system run
    expect(shouldGenerateDraft(shifts, 'weekly', new Date(`2026-03-14T0${SYSTEM_RUN_HOUR}:00:00`))).toBe(true);
  });

  // 3) Monthly invoices generate on the morning of the last scheduled shift in the month
  it('monthly: billing period is calendar month', () => {
    const ref = new Date('2026-03-15T10:00:00');
    const { start, end } = getBillingPeriod('monthly', ref);
    expect(start.getMonth()).toBe(2); // March
    expect(start.getDate()).toBe(1);
    expect(end.getMonth()).toBe(2);
    expect(end.getDate()).toBe(31);
  });

  it('monthly: triggers during early morning system run on the last scheduled shift day', () => {
    const shifts = [
      makeShift('s1', 'f1', 'booked', '2026-03-03'),
      makeShift('s2', 'f1', 'booked', '2026-03-12'),
      makeShift('s3', 'f1', 'booked', '2026-03-29'),
    ];
    const triggerDate = getGenerationTriggerDate(shifts, 'monthly');
    expect(triggerDate!.getDate()).toBe(29); // Last shift, not March 31
    expect(triggerDate!.getHours()).toBe(SYSTEM_RUN_HOUR);

    expect(shouldGenerateDraft(shifts, 'monthly', new Date('2026-03-29T04:00:00'))).toBe(false);
    expect(shouldGenerateDraft(shifts, 'monthly', new Date(`2026-03-29T0${SYSTEM_RUN_HOUR}:00:00`))).toBe(true);
  });

  // 4) Shift end time is NOT required for invoice generation
  it('shift is eligible regardless of end time', () => {
    // Shift hasn't ended yet
    const futureEnd = new Date();
    futureEnd.setHours(futureEnd.getHours() + 5);
    const shift: Shift = {
      id: 's1', facility_id: 'f1', status: 'booked',
      start_datetime: new Date().toISOString(),
      end_datetime: futureEnd.toISOString(),
      rate_applied: 850, notes: '', color: 'blue',
    };
    expect(isShiftInvoiceEligible(shift, new Set())).toBe(true);
  });

  // 5) Manual shift completion is NOT required
  it('booked shifts are eligible without completion', () => {
    const shift = makeShift('s1', 'f1', 'booked', '2026-03-10');
    expect(isShiftInvoiceEligible(shift, new Set())).toBe(true);
  });

  // 6) Canceled shifts are excluded
  it('excludes canceled shifts', () => {
    const shift = makeShift('s1', 'f1', 'canceled', '2026-03-10');
    expect(isShiftInvoiceEligible(shift, new Set())).toBe(false);
  });

  // 7) Draft invoices update when shifts are added or removed before sending
  it('draft invoices can be rebuilt with updated shifts', () => {
    const facility = makeFacility();
    const period = getBillingPeriod('monthly', new Date('2026-03-15'));
    
    // Initial: 2 shifts
    const shifts1 = [
      makeShift('s1', 'f1', 'booked', '2026-03-05'),
      makeShift('s2', 'f1', 'booked', '2026-03-10'),
    ];
    const draft1 = buildAutoInvoiceDraft(facility, shifts1, period.start, period.end, 'TST-001');
    expect(draft1.lineItems).toHaveLength(2);
    
    // After adding a shift: 3 shifts
    const shifts2 = [...shifts1, makeShift('s3', 'f1', 'booked', '2026-03-20')];
    const draft2 = buildAutoInvoiceDraft(facility, shifts2, period.start, period.end, 'TST-001');
    expect(draft2.lineItems).toHaveLength(3);
    
    // After canceling s2: only s1, s3
    const shifts3 = [shifts1[0], shifts2[2]];
    const draft3 = buildAutoInvoiceDraft(facility, shifts3, period.start, period.end, 'TST-001');
    expect(draft3.lineItems).toHaveLength(2);
    expect(draft3.lineItems.map(li => li.shift_id)).toEqual(['s1', 's3']);
  });

  // 8) Sent invoices are NOT auto-updated
  it('sent invoice shift IDs are protected from re-inclusion', () => {
    const sentInvoice: Invoice = {
      id: 'inv1', facility_id: 'f1', invoice_number: 'TST-001',
      invoice_date: '', period_start: '', period_end: '',
      total_amount: 850, balance_due: 850, status: 'sent',
      sent_at: '2026-03-15', paid_at: null, due_date: null,
      notes: '', share_token: null, share_token_created_at: null,
      share_token_revoked_at: null, invoice_type: 'bulk',
      generation_type: 'automatic', billing_cadence: 'monthly',
    };
    const lineItems: InvoiceLineItem[] = [
      { id: 'li1', invoice_id: 'inv1', shift_id: 's1', description: '', service_date: null, qty: 1, unit_rate: 850, line_total: 850 },
    ];
    
    const sentIds = getSentInvoiceShiftIds(lineItems, [sentInvoice]);
    expect(sentIds.has('s1')).toBe(true);
    
    // s1 should not be eligible since it's on a sent invoice
    const shift = makeShift('s1', 'f1', 'booked', '2026-03-10');
    expect(isShiftInvoiceEligible(shift, sentIds)).toBe(false);
  });

  // 9) Missing billing contact does NOT block draft generation
  it('generates draft even without billing contact', () => {
    const facility = makeFacility({ invoice_email_to: '', invoice_name_to: '' });
    const shifts = [makeShift('s1', 'f1', 'booked', '2026-03-10')];
    const period = getBillingPeriod('daily', new Date('2026-03-10'));
    const { invoice } = buildAutoInvoiceDraft(facility, shifts, period.start, period.end, 'TST-001');
    expect(invoice.status).toBe('draft');

    const { canSend, warnings } = canSendInvoice(facility, {
      first_name: 'Jane', last_name: 'Doe', company_name: 'LLC', email: 'j@t.com',
    });
    expect(canSend).toBe(true); // sender is complete
    expect(warnings.length).toBeGreaterThan(0); // billing contact warning
  });

  // 10) Missing sender details do NOT block draft but DO block sending
  it('blocks sending when sender details are missing', () => {
    const facility = makeFacility();
    const { canSend, blockers } = canSendInvoice(facility, {
      first_name: '', last_name: '', company_name: '', email: null,
    });
    expect(canSend).toBe(false);
    expect(blockers.length).toBeGreaterThan(0);
  });

  // Auto-generated invoices are always drafts
  it('auto-generated invoices are draft status', () => {
    const facility = makeFacility();
    const shifts = [makeShift('s1', 'f1', 'booked', '2026-03-10')];
    const period = getBillingPeriod('monthly', new Date('2026-03-10'));
    const { invoice } = buildAutoInvoiceDraft(facility, shifts, period.start, period.end, 'TST-001');
    expect(invoice.status).toBe('draft');
    expect(invoice.generation_type).toBe('automatic');
    expect(invoice.sent_at).toBeNull();
  });

  // Shift traceability
  it('preserves shift_id in line items', () => {
    const facility = makeFacility();
    const shifts = [makeShift('s1', 'f1', 'booked', '2026-03-05'), makeShift('s2', 'f1', 'booked', '2026-03-10')];
    const period = getBillingPeriod('monthly', new Date('2026-03-10'));
    const { lineItems } = buildAutoInvoiceDraft(facility, shifts, period.start, period.end, 'TST-001');
    expect(lineItems[0].shift_id).toBe('s1');
    expect(lineItems[1].shift_id).toBe('s2');
  });

  it('billing cadence stored on auto-generated invoice', () => {
    const facility = makeFacility({ billing_cadence: 'weekly' });
    const shifts = [makeShift('s1', 'f1', 'booked', '2026-03-10')];
    const period = getBillingPeriod('weekly', new Date('2026-03-10'));
    const { invoice } = buildAutoInvoiceDraft(facility, shifts, period.start, period.end, 'TST-001');
    expect(invoice.billing_cadence).toBe('weekly');
  });

  it('builds set of invoiced shift IDs from line items', () => {
    const lineItems: InvoiceLineItem[] = [
      { id: 'li1', invoice_id: 'i1', shift_id: 's1', description: '', service_date: null, qty: 1, unit_rate: 100, line_total: 100 },
      { id: 'li2', invoice_id: 'i1', shift_id: null, description: '', service_date: null, qty: 1, unit_rate: 50, line_total: 50 },
      { id: 'li3', invoice_id: 'i2', shift_id: 's3', description: '', service_date: null, qty: 1, unit_rate: 200, line_total: 200 },
    ];
    const ids = getInvoicedShiftIds(lineItems);
    expect(ids.has('s1')).toBe(true);
    expect(ids.has('s3')).toBe(true);
    expect(ids.size).toBe(2);
  });

  // Billing defaults still work
  it('weekly cadence defaults billing week end day to Saturday', () => {
    expect(DEFAULT_BILLING_WEEK_END_DAY).toBe('saturday');
    const config = getDefaultBillingConfig('f1');
    expect(config.billing_week_end_day).toBe('saturday');
  });

  it('validates sender profile correctly', () => {
    const valid = validateSenderProfile({
      first_name: 'Jane', last_name: 'Doe', company_name: 'LocumVet LLC',
      company_address: '123 Main St', email: 'jane@test.com', phone: null,
    });
    expect(valid.valid).toBe(true);
  });
});
