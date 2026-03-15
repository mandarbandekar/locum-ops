import { describe, it, expect } from 'vitest';
import { detectShiftConflicts, computeInvoiceStatus, generateInvoiceNumber } from '@/lib/businessLogic';
import { Shift, Invoice } from '@/types';

describe('detectShiftConflicts', () => {
  const baseShifts: Shift[] = [
    { id: 's1', facility_id: 'c1', start_datetime: '2026-03-10T08:00:00Z', end_datetime: '2026-03-10T18:00:00Z', status: 'booked', rate_applied: 850, notes: '', color: 'blue' },
    { id: 's2', facility_id: 'c2', start_datetime: '2026-03-11T09:00:00Z', end_datetime: '2026-03-11T17:00:00Z', status: 'booked', rate_applied: 900, notes: '', color: 'blue' },
    { id: 's3', facility_id: 'c1', start_datetime: '2026-03-12T08:00:00Z', end_datetime: '2026-03-12T18:00:00Z', status: 'canceled', rate_applied: 850, notes: '', color: 'blue' },
  ];

  it('detects overlapping shift', () => {
    const conflicts = detectShiftConflicts(baseShifts, { start_datetime: '2026-03-10T10:00:00Z', end_datetime: '2026-03-10T14:00:00Z' });
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].id).toBe('s1');
  });

  it('no conflict for non-overlapping shift', () => {
    const conflicts = detectShiftConflicts(baseShifts, { start_datetime: '2026-03-10T18:00:00Z', end_datetime: '2026-03-10T22:00:00Z' });
    expect(conflicts).toHaveLength(0);
  });

  it('ignores canceled shifts', () => {
    const conflicts = detectShiftConflicts(baseShifts, { start_datetime: '2026-03-12T10:00:00Z', end_datetime: '2026-03-12T14:00:00Z' });
    expect(conflicts).toHaveLength(0);
  });

  it('excludes self when editing', () => {
    const conflicts = detectShiftConflicts(baseShifts, { start_datetime: '2026-03-10T08:00:00Z', end_datetime: '2026-03-10T18:00:00Z', id: 's1' });
    expect(conflicts).toHaveLength(0);
  });
});

describe('computeInvoiceStatus', () => {
  const base = { invoice_date: '', balance_due: 0, notes: '', share_token: null, share_token_created_at: null, share_token_revoked_at: null, invoice_type: 'single' as const, billing_email_to: '', billing_email_cc: '', billing_email_bcc: '' };

  it('returns draft for draft invoices', () => {
    const inv: Invoice = { id: '1', facility_id: 'c1', invoice_number: 'INV-001', period_start: '', period_end: '', total_amount: 100, status: 'draft', sent_at: null, paid_at: null, due_date: null, ...base };
    expect(computeInvoiceStatus(inv)).toBe('draft');
  });

  it('returns paid for paid invoices', () => {
    const inv: Invoice = { id: '1', facility_id: 'c1', invoice_number: 'INV-001', period_start: '', period_end: '', total_amount: 100, status: 'paid', sent_at: '2026-01-01', paid_at: '2026-01-10', due_date: '2026-01-15', ...base };
    expect(computeInvoiceStatus(inv)).toBe('paid');
  });

  it('returns overdue when past due date and unpaid', () => {
    const inv: Invoice = { id: '1', facility_id: 'c1', invoice_number: 'INV-001', period_start: '', period_end: '', total_amount: 100, status: 'sent', sent_at: '2025-01-01', paid_at: null, due_date: '2025-01-15', ...base, balance_due: 100 };
    expect(computeInvoiceStatus(inv)).toBe('overdue');
  });

  it('returns sent when due date is in the future', () => {
    const inv: Invoice = { id: '1', facility_id: 'c1', invoice_number: 'INV-001', period_start: '', period_end: '', total_amount: 100, status: 'sent', sent_at: '2026-01-01', paid_at: null, due_date: '2099-01-15', ...base, balance_due: 100 };
    expect(computeInvoiceStatus(inv)).toBe('sent');
  });
});

describe('generateInvoiceNumber', () => {
  const base = { invoice_date: '', balance_due: 0, notes: '', share_token: null, share_token_created_at: null, share_token_revoked_at: null, invoice_type: 'single' as const };
  it('generates sequential numbers', () => {
    const existing: Invoice[] = [
      { id: '1', facility_id: 'c1', invoice_number: `INV-${new Date().getFullYear()}-001`, period_start: '', period_end: '', total_amount: 0, status: 'draft', sent_at: null, paid_at: null, due_date: null, ...base },
    ];
    const next = generateInvoiceNumber(existing);
    expect(next).toBe(`INV-${new Date().getFullYear()}-002`);
  });
});
