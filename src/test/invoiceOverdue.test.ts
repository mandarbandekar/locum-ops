import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isInvoiceOverdue } from '@/lib/invoiceHelpers';
import { computeInvoiceStatus } from '@/lib/businessLogic';
import type { Invoice } from '@/types';

const NOW = new Date('2026-05-06T12:00:00');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
});

const baseInv = (overrides: Partial<Invoice> = {}): Invoice => ({
  id: 'i1', facility_id: 'f1', invoice_number: 'INV-001',
  invoice_date: '2026-04-01', period_start: '2026-04-01', period_end: '2026-04-30',
  total_amount: 1000, balance_due: 1000,
  status: 'sent',
  sent_at: '2026-04-15T10:00:00Z',
  paid_at: null,
  due_date: '2026-05-01',
  notes: '', share_token: null, share_token_created_at: null, share_token_revoked_at: null,
  invoice_type: 'single', generation_type: 'manual', billing_cadence: null,
  ...overrides,
});

describe('isInvoiceOverdue', () => {
  it('returns true for sent invoice past due_date with balance', () => {
    expect(isInvoiceOverdue(baseInv({ due_date: '2026-05-01' }))).toBe(true);
  });

  it('returns true for partial invoice past due_date with balance', () => {
    expect(isInvoiceOverdue(baseInv({ status: 'partial', balance_due: 200 }))).toBe(true);
  });

  it('returns false when status is draft', () => {
    expect(isInvoiceOverdue(baseInv({ status: 'draft' }))).toBe(false);
  });

  it('returns false when status is paid', () => {
    expect(isInvoiceOverdue(baseInv({ status: 'paid', balance_due: 0 }))).toBe(false);
  });

  it('returns false when paid_at is set even if due_date passed', () => {
    expect(isInvoiceOverdue(baseInv({ paid_at: '2026-05-02T00:00:00Z' }))).toBe(false);
  });

  it('returns false when due_date is null', () => {
    expect(isInvoiceOverdue(baseInv({ due_date: null }))).toBe(false);
  });

  it('returns false when balance_due is 0', () => {
    expect(isInvoiceOverdue(baseInv({ balance_due: 0 }))).toBe(false);
  });

  it('returns false when due_date is in the future', () => {
    expect(isInvoiceOverdue(baseInv({ due_date: '2026-06-01' }))).toBe(false);
  });

  it('edge: due_date equals today — not overdue (overdue starts the next day)', () => {
    expect(isInvoiceOverdue(baseInv({ due_date: '2026-05-06' }))).toBe(false);
  });

  it('edge: due_date is tomorrow — not overdue', () => {
    expect(isInvoiceOverdue(baseInv({ due_date: '2026-05-07' }))).toBe(false);
  });

  it('edge: due_date one second in the future — not overdue', () => {
    const future = new Date(NOW.getTime() + 1000).toISOString();
    expect(isInvoiceOverdue(baseInv({ due_date: future }))).toBe(false);
  });

  it('edge: due_date was yesterday — overdue', () => {
    expect(isInvoiceOverdue(baseInv({ due_date: '2026-05-05' }))).toBe(true);
  });
});

describe('computeInvoiceStatus', () => {
  it('returns "overdue" for past-due sent invoice with balance', () => {
    expect(computeInvoiceStatus(baseInv({ due_date: '2026-05-01' }))).toBe('overdue');
  });

  it('returns "paid" without checking due_date', () => {
    expect(computeInvoiceStatus(baseInv({
      status: 'paid', balance_due: 0, due_date: '2026-01-01', paid_at: '2026-04-20',
    }))).toBe('paid');
  });

  it('returns "draft" without checking due_date', () => {
    expect(computeInvoiceStatus(baseInv({
      status: 'draft', due_date: '2026-01-01',
    }))).toBe('draft');
  });

  it('returns underlying "sent" when not yet overdue', () => {
    expect(computeInvoiceStatus(baseInv({ due_date: '2026-06-01' }))).toBe('sent');
  });

  it('returns "partial" when not yet overdue but partially paid', () => {
    expect(computeInvoiceStatus(baseInv({
      status: 'partial', balance_due: 300, due_date: '2026-06-01',
    }))).toBe('partial');
  });

  it('partial + past due + remaining balance → "overdue"', () => {
    expect(computeInvoiceStatus(baseInv({
      status: 'partial', balance_due: 300, due_date: '2026-04-30',
    }))).toBe('overdue');
  });

  it('paid_at set on a sent invoice prevents overdue (data-quality guard)', () => {
    expect(computeInvoiceStatus(baseInv({
      status: 'sent', due_date: '2026-04-30', paid_at: '2026-05-01T00:00:00Z',
    }))).toBe('sent');
  });
});
