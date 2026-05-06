/**
 * End-to-end-style test for the dashboard quarterly cards.
 *
 * We don't have a browser-driver E2E rig, so this test exercises the same
 * pure pipeline the dashboard uses (`dashboardCalculations`) against seeded
 * shifts / invoices / payments and asserts that the quarterly cards update
 * the way the UI does after a user marks an invoice paid.
 *
 * Flow under test:
 *   1. Seed two Q2 shifts ($850 + $900) and one Q1 shift ($700).
 *   2. Seed a Q2 invoice covering both Q2 shifts ($1,750).
 *   3. Initially: no payments yet — "earned this quarter" reflects shifts,
 *      "collected this quarter" is $0.
 *   4. User marks the invoice paid → a `payments` row is inserted.
 *   5. After re-deriving from the new payments list, "collected this quarter"
 *      jumps to $1,750 while "earned this quarter" stays unchanged (it's
 *      driven by shift end dates, not payment dates).
 *   6. Estimated quarterly tax (heuristic branch) tracks "earned", not
 *      "collected", so it must not change when the invoice is marked paid.
 */

import { describe, it, expect } from 'vitest';
import {
  getQuarterRange,
  sumPaymentsInRange,
  sumShiftEarningsInRange,
  computeEstimatedQuarterlyTax,
} from '@/lib/dashboardCalculations';

interface SeedShift { id: string; end_datetime: string; rate_applied: number }
interface SeedInvoice { id: string; shift_ids: string[]; total_amount: number; status: 'draft' | 'sent' | 'paid' }
interface SeedPayment { id: string; invoice_id: string; payment_date: string; amount: number }

function deriveQuarterCards(args: {
  now: Date;
  shifts: SeedShift[];
  payments: SeedPayment[];
}) {
  const { start, end, quarter } = getQuarterRange(args.now);
  const earnedThisQuarter = sumShiftEarningsInRange(args.shifts, start, end);
  const collectedThisQuarter = sumPaymentsInRange(args.payments, start, end);
  const estimatedQuarterlyTax = computeEstimatedQuarterlyTax({
    earnedThisQuarter,
    taxProfile: null, // exercise the 25% heuristic branch
    shifts: args.shifts,
    facilities: [],
    now: args.now,
    getQuarterTotal: () => 0,
  });
  return { quarter, earnedThisQuarter, collectedThisQuarter, estimatedQuarterlyTax };
}

/** Simulate the "mark invoice paid" action: flip status and insert a payment. */
function markInvoicePaid(
  invoices: SeedInvoice[],
  payments: SeedPayment[],
  invoiceId: string,
  paidOn: string,
): { invoices: SeedInvoice[]; payments: SeedPayment[] } {
  const inv = invoices.find(i => i.id === invoiceId);
  if (!inv) throw new Error(`invoice ${invoiceId} not found`);
  const nextInvoices = invoices.map(i =>
    i.id === invoiceId ? { ...i, status: 'paid' as const } : i,
  );
  const nextPayments = [
    ...payments,
    { id: `pay-${invoiceId}`, invoice_id: invoiceId, payment_date: paidOn, amount: inv.total_amount },
  ];
  return { invoices: nextInvoices, payments: nextPayments };
}

describe('Dashboard quarterly cards — mark-paid flow', () => {
  // Anchor "now" mid-Q2 2026 in local time so the quarter window is deterministic.
  const now = new Date(2026, 4, 15, 12, 0, 0); // May 15 2026

  const shifts: SeedShift[] = [
    { id: 's-q1', end_datetime: '2026-02-10T18:00:00Z', rate_applied: 700 },
    { id: 's-q2-a', end_datetime: '2026-04-12T18:00:00Z', rate_applied: 850 },
    { id: 's-q2-b', end_datetime: '2026-05-08T18:00:00Z', rate_applied: 900 },
  ];

  let invoices: SeedInvoice[] = [
    { id: 'inv-q2', shift_ids: ['s-q2-a', 's-q2-b'], total_amount: 1750, status: 'sent' },
  ];
  let payments: SeedPayment[] = [];

  it('initial state: earned reflects Q2 shifts; collected and tax-from-earnings are correct', () => {
    const cards = deriveQuarterCards({ now, shifts, payments });
    expect(cards.quarter).toBe(2);
    expect(cards.earnedThisQuarter).toBe(1750);   // 850 + 900
    expect(cards.collectedThisQuarter).toBe(0);
    expect(cards.estimatedQuarterlyTax).toBe(Math.round(1750 * 0.25)); // 438
  });

  it('after marking the Q2 invoice paid, collected jumps and earned stays', () => {
    ({ invoices, payments } = markInvoicePaid(invoices, payments, 'inv-q2', '2026-05-15'));

    const cards = deriveQuarterCards({ now, shifts, payments });
    expect(cards.collectedThisQuarter).toBe(1750);
    expect(cards.earnedThisQuarter).toBe(1750);
    // Heuristic tax is a function of earnings, not payments → unchanged.
    expect(cards.estimatedQuarterlyTax).toBe(Math.round(1750 * 0.25));

    // Sanity: the underlying invoice is now paid.
    expect(invoices.find(i => i.id === 'inv-q2')?.status).toBe('paid');
  });

  it('a payment dated outside Q2 must not leak into the Q2 collected card', () => {
    const earlyPayment: SeedPayment = {
      id: 'pay-early', invoice_id: 'inv-q1-virtual',
      payment_date: '2026-03-31', amount: 5000,
    };
    const cards = deriveQuarterCards({ now, shifts, payments: [...payments, earlyPayment] });
    expect(cards.collectedThisQuarter).toBe(1750); // unchanged from Q2 payment only
  });

  it('a Q1 shift never appears in Q2 earned even after mark-paid', () => {
    // Mark a hypothetical Q1 invoice paid in April; collected goes up but
    // earned-this-quarter only sees Q2 shift end dates.
    const moreShifts = shifts;
    const morePayments: SeedPayment[] = [
      ...payments,
      { id: 'pay-q1', invoice_id: 'inv-q1', payment_date: '2026-04-05', amount: 700 },
    ];
    const cards = deriveQuarterCards({ now, shifts: moreShifts, payments: morePayments });
    expect(cards.collectedThisQuarter).toBe(1750 + 700); // both fall inside Q2 window
    expect(cards.earnedThisQuarter).toBe(1750);          // Q1 shift excluded by end_datetime
  });
});
