/**
 * Mobile invoice editing — line item rules + totals / status timeline.
 *
 * Validates the rules the mobile invoice detail screen relies on when the user
 * taps "Edit invoice" and is handed off to the shared invoice editor:
 *   • line_total is always qty * unit_rate, rounded to cents (matches
 *     InvoiceEditPanel.handleSave).
 *   • total_amount = Σ(line_total); balance_due = total_amount − Σ(payments).
 *   • Edits are only honored while the invoice is in `draft` — sent/partial
 *     invoices keep their stored totals untouched (no silent recalcs).
 *   • Status timeline derived by computeInvoiceStatus:
 *         draft → sent → partial → paid
 *         sent/partial flip to `overdue` once due_date is in the past.
 */

import { describe, it, expect } from 'vitest';
import { computeInvoiceStatus } from '@/lib/businessLogic';
import type { Invoice, InvoiceLineItem } from '@/types';

// Mirrors InvoiceEditPanel.handleSave (line 86) — single source of truth.
function recalcLineTotal(qty: number, unit_rate: number): number {
  return Math.round((qty || 0) * (unit_rate || 0) * 100) / 100;
}

// Mirrors the recalc done in DataContext when a draft's items change.
function recalcInvoiceTotals(
  invoice: Pick<Invoice, 'status' | 'total_amount' | 'balance_due'>,
  lineItems: Array<Pick<InvoiceLineItem, 'line_total'>>,
  paidSoFar = 0,
): { total_amount: number; balance_due: number; mutated: boolean } {
  if (invoice.status !== 'draft') {
    return {
      total_amount: invoice.total_amount,
      balance_due: invoice.balance_due,
      mutated: false,
    };
  }
  const total =
    Math.round(lineItems.reduce((s, li) => s + (li.line_total || 0), 0) * 100) / 100;
  const balance = Math.round((total - paidSoFar) * 100) / 100;
  return { total_amount: total, balance_due: balance, mutated: true };
}

const baseInvoice = (over: Partial<Invoice> = {}): Invoice =>
  ({
    id: 'inv-1',
    invoice_number: 'INV-2026-001',
    facility_id: 'f1',
    status: 'draft',
    total_amount: 0,
    balance_due: 0,
    due_date: null,
    paid_at: null,
    sent_at: null,
    invoice_date: '2026-04-01',
    ...over,
  } as Invoice);

const baseLine = (over: Partial<InvoiceLineItem> = {}): InvoiceLineItem =>
  ({
    id: 'li-1',
    invoice_id: 'inv-1',
    shift_id: 's1',
    description: 'Shift',
    service_date: '2026-04-01',
    qty: 1,
    unit_rate: 850,
    line_total: 850,
    line_kind: 'flat',
    ...over,
  } as InvoiceLineItem);

// ─── Line item editing rules ──────────────────────────────────────────────

describe('Mobile invoice — line item editing rules', () => {
  it('recomputes line_total as qty × unit_rate, rounded to cents', () => {
    expect(recalcLineTotal(2, 850)).toBe(1700);
    expect(recalcLineTotal(1.5, 200)).toBe(300);
    expect(recalcLineTotal(0.333, 99.99)).toBe(33.3);
  });

  it('treats blank/zero qty or rate as 0 (cleared field)', () => {
    expect(recalcLineTotal(0, 850)).toBe(0);
    expect(recalcLineTotal(3, 0)).toBe(0);
    expect(recalcLineTotal(NaN as unknown as number, 100)).toBe(0);
  });

  it('rounds half-cents away from zero so totals match displayed currency', () => {
    // 1.005 → 1.01 (avoid floating-point drift surfacing as $9.99 vs $10.00)
    expect(recalcLineTotal(1, 1.005)).toBe(1.01);
  });
});

// ─── Totals after edits ───────────────────────────────────────────────────

describe('Mobile invoice — totals update after line item edits', () => {
  it('sums updated line totals when editing qty/rate on a draft', () => {
    const inv = baseInvoice({ total_amount: 850, balance_due: 850 });
    const items = [
      baseLine({ id: 'li-a', qty: 2, unit_rate: 850, line_total: recalcLineTotal(2, 850) }),
      baseLine({ id: 'li-b', qty: 1, unit_rate: 125, line_total: recalcLineTotal(1, 125) }),
    ];
    const r = recalcInvoiceTotals(inv, items);
    expect(r.mutated).toBe(true);
    expect(r.total_amount).toBe(1825);
    expect(r.balance_due).toBe(1825);
  });

  it('removing a line drops the total', () => {
    const inv = baseInvoice();
    const after = [baseLine({ id: 'li-a', qty: 1, unit_rate: 900, line_total: 900 })];
    expect(recalcInvoiceTotals(inv, after).total_amount).toBe(900);
  });

  it('balance_due reflects payments already applied', () => {
    const inv = baseInvoice();
    const items = [baseLine({ qty: 1, unit_rate: 1000, line_total: 1000 })];
    const r = recalcInvoiceTotals(inv, items, 400);
    expect(r.total_amount).toBe(1000);
    expect(r.balance_due).toBe(600);
  });

  it('refuses to recalc once the invoice has left draft', () => {
    const sent = baseInvoice({ status: 'sent', total_amount: 850, balance_due: 850 });
    const tampered = [baseLine({ qty: 99, unit_rate: 999, line_total: 98_901 })];
    const r = recalcInvoiceTotals(sent, tampered);
    expect(r.mutated).toBe(false);
    expect(r.total_amount).toBe(850);
    expect(r.balance_due).toBe(850);
  });
});

// ─── Status timeline ──────────────────────────────────────────────────────

const todayPlus = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

describe('Mobile invoice — status timeline after edits', () => {
  it('draft stays draft regardless of due_date', () => {
    const draft = baseInvoice({ status: 'draft', due_date: todayPlus(-30), balance_due: 100 });
    expect(computeInvoiceStatus(draft)).toBe('draft');
  });

  it('sent invoice with a future due_date stays sent', () => {
    const sent = baseInvoice({
      status: 'sent',
      due_date: todayPlus(7),
      balance_due: 850,
      total_amount: 850,
    });
    expect(computeInvoiceStatus(sent)).toBe('sent');
  });

  it('sent invoice with a past due_date and balance owed flips to overdue', () => {
    const overdue = baseInvoice({
      status: 'sent',
      due_date: todayPlus(-1),
      balance_due: 850,
      total_amount: 850,
    });
    expect(computeInvoiceStatus(overdue)).toBe('overdue');
  });

  it('partial invoice with past due_date and remaining balance flips to overdue', () => {
    const partial = baseInvoice({
      status: 'partial',
      due_date: todayPlus(-3),
      balance_due: 250,
      total_amount: 1000,
    });
    expect(computeInvoiceStatus(partial)).toBe('overdue');
  });

  it('paid invoice never reports overdue, even with a past due_date', () => {
    const paid = baseInvoice({
      status: 'paid',
      due_date: todayPlus(-30),
      balance_due: 0,
      total_amount: 850,
      paid_at: new Date().toISOString(),
    });
    expect(computeInvoiceStatus(paid)).toBe('paid');
  });

  it('zero balance on a sent invoice does not show as overdue', () => {
    const zeroed = baseInvoice({
      status: 'sent',
      due_date: todayPlus(-5),
      balance_due: 0,
      total_amount: 850,
    });
    expect(computeInvoiceStatus(zeroed)).toBe('sent');
  });
});
