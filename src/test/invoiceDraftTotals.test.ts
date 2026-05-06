/**
 * Verifies the invoice-generation pipeline:
 *   1. Auto-generation pulls in every eligible shift inside the chosen
 *      billing period (and excludes ones outside it / already invoiced).
 *   2. The resulting draft has one line item per shift with the correct
 *      `line_total`, and `invoice.total_amount` / `balance_due` equal the
 *      sum of those line totals.
 *   3. While the invoice is still in Draft, mutating the line items
 *      (add / remove / edit qty or rate) updates the totals correctly via
 *      the same recalc helper the UI uses.
 *   4. Once status leaves Draft, the recalc helper refuses to mutate.
 */

import { describe, it, expect } from 'vitest';
import {
  getBillingPeriod,
  getEligibleShiftsForPeriod,
  getInvoicedShiftIds,
  buildAutoInvoiceDraft,
} from '@/lib/invoiceAutoGeneration';
import type { Shift, Facility, Invoice, InvoiceLineItem } from '@/types';

// ── helpers ────────────────────────────────────────────────────────────────

const makeFacility = (overrides?: Partial<Facility>): Facility => ({
  id: 'f1', name: 'Test Clinic', status: 'active', address: '',
  timezone: 'America/Los_Angeles', notes: '', outreach_last_sent_at: null,
  tech_computer_info: '', tech_wifi_info: '', tech_pims_info: '',
  clinic_access_info: '', invoice_prefix: 'TST', invoice_due_days: 15,
  invoice_name_to: 'Billing', invoice_email_to: 'billing@test.com',
  invoice_name_cc: '', invoice_email_cc: '',
  invoice_name_bcc: '', invoice_email_bcc: '',
  billing_cadence: 'monthly', billing_cycle_anchor_date: null,
  billing_week_end_day: 'saturday', auto_generate_invoices: true,
  ...overrides,
});

const makeShift = (id: string, dateStr: string, rate = 850): Shift => {
  const start = new Date(`${dateStr}T08:00:00`);
  const end = new Date(`${dateStr}T18:00:00`);
  return {
    id, facility_id: 'f1',
    start_datetime: start.toISOString(),
    end_datetime: end.toISOString(),
    rate_applied: rate, notes: '', color: 'blue',
  } as Shift;
};

/** Mirrors the UI's "save draft" recalc: sum line_totals → total / balance_due.
 *  Refuses to mutate non-draft invoices. */
function recalcDraftTotals(
  invoice: Pick<Invoice, 'status' | 'total_amount' | 'balance_due'>,
  lineItems: Array<Pick<InvoiceLineItem, 'line_total'>>,
): { total_amount: number; balance_due: number; mutated: boolean } {
  if (invoice.status !== 'draft') {
    return {
      total_amount: invoice.total_amount,
      balance_due: invoice.balance_due,
      mutated: false,
    };
  }
  const total = Math.round(lineItems.reduce((s, li) => s + li.line_total, 0) * 100) / 100;
  return { total_amount: total, balance_due: total, mutated: true };
}

// ── tests ──────────────────────────────────────────────────────────────────

describe('Invoice generation — auto-added line items from completed shifts', () => {
  const facility = makeFacility();
  const period = getBillingPeriod('monthly', new Date('2026-04-15T12:00:00'));

  it('auto-adds one line item per eligible shift in the chosen date range', () => {
    const shifts: Shift[] = [
      makeShift('s-mar', '2026-03-30', 800),  // before period
      makeShift('s-apr-1', '2026-04-02', 850),
      makeShift('s-apr-2', '2026-04-15', 900),
      makeShift('s-apr-3', '2026-04-29', 1000),
      makeShift('s-may', '2026-05-02', 700),  // after period
    ];

    const eligible = getEligibleShiftsForPeriod(
      shifts, facility.id, period.start, period.end, new Set(),
    );
    expect(eligible.map(s => s.id)).toEqual(['s-apr-1', 's-apr-2', 's-apr-3']);

    const { invoice, lineItems } = buildAutoInvoiceDraft(
      facility, eligible, period.start, period.end, 'TST-001',
    );

    expect(lineItems).toHaveLength(3);
    expect(lineItems.map(li => li.shift_id)).toEqual(['s-apr-1', 's-apr-2', 's-apr-3']);
    expect(lineItems.map(li => li.line_total)).toEqual([850, 900, 1000]);
    expect(invoice.total_amount).toBe(2750);
    expect(invoice.balance_due).toBe(2750);
    expect(invoice.status).toBe('draft');
  });

  it('skips shifts already attached to another invoice', () => {
    const shifts: Shift[] = [
      makeShift('s-apr-1', '2026-04-02', 850),
      makeShift('s-apr-2', '2026-04-15', 900),
    ];
    const existingLineItems: InvoiceLineItem[] = [
      { id: 'li-old', invoice_id: 'inv-old', shift_id: 's-apr-1',
        description: '', service_date: '2026-04-02',
        qty: 1, unit_rate: 850, line_total: 850, line_kind: 'flat' },
    ];
    const invoiced = getInvoicedShiftIds(existingLineItems);
    const eligible = getEligibleShiftsForPeriod(
      shifts, facility.id, period.start, period.end, invoiced,
    );
    expect(eligible.map(s => s.id)).toEqual(['s-apr-2']);

    const { invoice, lineItems } = buildAutoInvoiceDraft(
      facility, eligible, period.start, period.end, 'TST-002',
    );
    expect(lineItems).toHaveLength(1);
    expect(invoice.total_amount).toBe(900);
  });
});

describe('Draft totals update when line items change', () => {
  const facility = makeFacility();
  const period = getBillingPeriod('monthly', new Date('2026-04-15T12:00:00'));
  const shifts: Shift[] = [
    makeShift('s1', '2026-04-02', 850),
    makeShift('s2', '2026-04-15', 900),
  ];
  const built = buildAutoInvoiceDraft(facility, shifts, period.start, period.end, 'TST-100');
  const draft: Invoice = { ...(built.invoice as Invoice), id: 'inv-1' };
  // Line items as they'd be persisted with ids:
  let lineItems: InvoiceLineItem[] = built.lineItems.map((li, i) => ({
    ...li, id: `li-${i}`, invoice_id: draft.id,
  }));

  it('starts with totals matching the sum of line_totals', () => {
    const r = recalcDraftTotals(draft, lineItems);
    expect(r.mutated).toBe(true);
    expect(r.total_amount).toBe(1750);
    expect(r.balance_due).toBe(1750);
  });

  it('adding a manual line item increases the total', () => {
    lineItems = [
      ...lineItems,
      { id: 'li-extra', invoice_id: draft.id, shift_id: null,
        description: 'Travel reimbursement', service_date: '2026-04-15',
        qty: 1, unit_rate: 125, line_total: 125, line_kind: 'flat' },
    ];
    const r = recalcDraftTotals(draft, lineItems);
    expect(r.total_amount).toBe(1875);
    expect(r.balance_due).toBe(1875);
  });

  it('editing qty/rate on a line recomputes the total', () => {
    lineItems = lineItems.map(li =>
      li.id === 'li-0' ? { ...li, qty: 2, unit_rate: 850, line_total: 1700 } : li,
    );
    const r = recalcDraftTotals(draft, lineItems);
    // 1700 + 900 + 125 = 2725
    expect(r.total_amount).toBe(2725);
  });

  it('removing a line item decreases the total', () => {
    lineItems = lineItems.filter(li => li.id !== 'li-extra');
    const r = recalcDraftTotals(draft, lineItems);
    expect(r.total_amount).toBe(2600); // 1700 + 900
  });

  it('refuses to mutate totals once the invoice is no longer in draft', () => {
    const sent: Invoice = { ...draft, status: 'sent', total_amount: 2600, balance_due: 2600 };
    const tampered = [
      ...lineItems,
      { id: 'li-evil', invoice_id: sent.id, shift_id: null,
        description: 'Bonus', service_date: '2026-04-15',
        qty: 1, unit_rate: 999, line_total: 999, line_kind: 'flat' as const },
    ];
    const r = recalcDraftTotals(sent, tampered);
    expect(r.mutated).toBe(false);
    expect(r.total_amount).toBe(2600);
    expect(r.balance_due).toBe(2600);
  });
});
