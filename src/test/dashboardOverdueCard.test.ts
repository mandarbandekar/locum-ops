/**
 * Dashboard "Overdue Invoices" card behavior.
 *
 * Mirrors the dashboard's derivation:
 *   overdue = invoices.filter(i => computeInvoiceStatus(i) === 'overdue')
 *   overdueTotal = sum of balance_due
 *
 * Verifies the card updates when the user:
 *   1. Marks an overdue invoice paid (status='paid', balance_due=0, paid_at set)
 *   2. Advances the due_date past today (e.g. extends terms)
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

const inv = (overrides: Partial<Invoice> = {}): Invoice => ({
  id: 'i', facility_id: 'f1', invoice_number: 'INV-001',
  invoice_date: '2026-03-01', period_start: '2026-03-01', period_end: '2026-03-31',
  total_amount: 1000, balance_due: 1000,
  status: 'sent', sent_at: '2026-03-15T10:00:00Z', paid_at: null,
  due_date: '2026-04-15',
  notes: '', share_token: null, share_token_created_at: null, share_token_revoked_at: null,
  invoice_type: 'single', generation_type: 'manual', billing_cadence: null,
  ...overrides,
});

function deriveOverdueCard(invoices: Invoice[]) {
  const overdue = invoices.filter(i => computeInvoiceStatus(i) === 'overdue');
  return {
    count: overdue.length,
    total: overdue.reduce((s, i) => s + i.balance_due, 0),
    ids: overdue.map(i => i.id),
  };
}

function markPaid(invoices: Invoice[], id: string, paidOn: string): Invoice[] {
  return invoices.map(i =>
    i.id === id ? { ...i, status: 'paid', balance_due: 0, paid_at: paidOn } : i,
  );
}

function setDueDate(invoices: Invoice[], id: string, due: string): Invoice[] {
  return invoices.map(i => (i.id === id ? { ...i, due_date: due } : i));
}

describe('Dashboard Overdue Invoices card', () => {
  it('initial state: counts only past-due sent/partial invoices with balance', () => {
    const invoices = [
      inv({ id: 'a', due_date: '2026-04-01', balance_due: 500 }),                   // overdue
      inv({ id: 'b', status: 'partial', due_date: '2026-04-20', balance_due: 300 }),// overdue
      inv({ id: 'c', due_date: '2026-06-01' }),                                     // not yet due
      inv({ id: 'd', status: 'paid', balance_due: 0, paid_at: '2026-04-30' }),     // paid
      inv({ id: 'e', status: 'draft', due_date: '2026-04-01' }),                   // draft
    ];
    const card = deriveOverdueCard(invoices);
    expect(card.count).toBe(2);
    expect(card.total).toBe(800);
    expect(card.ids.sort()).toEqual(['a', 'b']);
  });

  it('marking an overdue invoice paid removes it from the card and lowers total', () => {
    let invoices = [
      inv({ id: 'a', due_date: '2026-04-01', balance_due: 500 }),
      inv({ id: 'b', due_date: '2026-04-20', balance_due: 300 }),
    ];
    expect(deriveOverdueCard(invoices)).toMatchObject({ count: 2, total: 800 });

    invoices = markPaid(invoices, 'a', '2026-05-06T12:00:00Z');
    const card = deriveOverdueCard(invoices);
    expect(card.count).toBe(1);
    expect(card.total).toBe(300);
    expect(card.ids).toEqual(['b']);
  });

  it('marking the last overdue invoice paid empties the card', () => {
    let invoices = [inv({ id: 'a', due_date: '2026-04-01', balance_due: 500 })];
    invoices = markPaid(invoices, 'a', '2026-05-06T12:00:00Z');
    expect(deriveOverdueCard(invoices)).toEqual({ count: 0, total: 0, ids: [] });
  });

  it('advancing due_date past today removes the invoice from the card', () => {
    let invoices = [
      inv({ id: 'a', due_date: '2026-04-01', balance_due: 500 }),
      inv({ id: 'b', due_date: '2026-04-20', balance_due: 300 }),
    ];
    expect(deriveOverdueCard(invoices).count).toBe(2);

    // User extends invoice 'a' due date to next month.
    invoices = setDueDate(invoices, 'a', '2026-06-15');
    const card = deriveOverdueCard(invoices);
    expect(card.count).toBe(1);
    expect(card.total).toBe(300);
    expect(card.ids).toEqual(['b']);
  });

  it('moving due_date back into the past re-adds the invoice to the card', () => {
    let invoices = [inv({ id: 'a', due_date: '2026-06-15', balance_due: 500 })];
    expect(deriveOverdueCard(invoices).count).toBe(0);

    invoices = setDueDate(invoices, 'a', '2026-04-01');
    expect(deriveOverdueCard(invoices)).toMatchObject({ count: 1, total: 500 });
  });

  it('advancing due_date to exactly tomorrow removes from card; today keeps it', () => {
    let invoices = [inv({ id: 'a', due_date: '2026-04-01', balance_due: 500 })];

    invoices = setDueDate(invoices, 'a', '2026-05-07'); // tomorrow
    expect(deriveOverdueCard(invoices).count).toBe(0);

    invoices = setDueDate(invoices, 'a', '2026-05-06'); // today midnight < noon now → overdue
    expect(deriveOverdueCard(invoices).count).toBe(1);
  });
});
