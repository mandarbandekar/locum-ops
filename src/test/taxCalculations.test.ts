import { describe, it, expect } from 'vitest';
import {
  aggregateQuarterlyIncome,
  calculateSetAside,
  estimateSelfEmploymentTax,
  estimateFederalIncomeTax,
  estimateTotalTax,
  estimateQuarterlyPayments,
} from '@/lib/taxCalculations';
import { Invoice } from '@/types';

function makeInvoice(overrides: Partial<Invoice>): Invoice {
  return {
    id: '1',
    facility_id: 'f1',
    invoice_number: 'INV-001',
    invoice_date: '',
    period_start: '',
    period_end: '',
    total_amount: 0,
    balance_due: 0,
    status: 'draft',
    sent_at: null,
    paid_at: null,
    due_date: null,
    notes: '',
    share_token: null,
    share_token_created_at: null,
    share_token_revoked_at: null,
    invoice_type: 'single',
    generation_type: 'manual',
    billing_cadence: null,
    ...overrides,
  };
}

describe('aggregateQuarterlyIncome', () => {
  it('aggregates paid invoices into correct quarters by paid_at date', () => {
    const invoices: Invoice[] = [
      makeInvoice({ id: '1', total_amount: 1000, status: 'paid', paid_at: '2026-01-15T00:00:00Z' }),
      makeInvoice({ id: '2', total_amount: 2000, status: 'paid', paid_at: '2026-02-10T00:00:00Z' }),
      makeInvoice({ id: '3', total_amount: 500, status: 'paid', paid_at: '2026-04-01T00:00:00Z' }),
      makeInvoice({ id: '4', total_amount: 3000, status: 'paid', paid_at: '2026-10-20T00:00:00Z' }),
    ];

    const result = aggregateQuarterlyIncome(invoices, 2026);

    expect(result[0].income).toBe(3000); // Q1: Jan 1000 + Feb 2000
    expect(result[1].income).toBe(500);  // Q2: Apr 500
    expect(result[2].income).toBe(0);    // Q3: nothing
    expect(result[3].income).toBe(3000); // Q4: Oct 3000
  });

  it('ignores non-paid invoices', () => {
    const invoices: Invoice[] = [
      makeInvoice({ id: '1', total_amount: 5000, status: 'sent', paid_at: null }),
      makeInvoice({ id: '2', total_amount: 1000, status: 'draft', paid_at: null }),
      makeInvoice({ id: '3', total_amount: 800, status: 'paid', paid_at: '2026-03-01T00:00:00Z' }),
    ];

    const result = aggregateQuarterlyIncome(invoices, 2026);
    expect(result[0].income).toBe(800);
    expect(result[1].income).toBe(0);
    expect(result[2].income).toBe(0);
    expect(result[3].income).toBe(0);
  });

  it('ignores invoices from different years', () => {
    const invoices: Invoice[] = [
      makeInvoice({ id: '1', total_amount: 1000, status: 'paid', paid_at: '2025-06-15T00:00:00Z' }),
      makeInvoice({ id: '2', total_amount: 2000, status: 'paid', paid_at: '2026-06-15T00:00:00Z' }),
    ];

    const result = aggregateQuarterlyIncome(invoices, 2026);
    expect(result[1].income).toBe(2000); // Q2
    const total = result.reduce((s, q) => s + q.income, 0);
    expect(total).toBe(2000);
  });

  it('provides monthly breakdown', () => {
    const invoices: Invoice[] = [
      makeInvoice({ id: '1', total_amount: 100, status: 'paid', paid_at: '2026-01-05T00:00:00Z' }),
      makeInvoice({ id: '2', total_amount: 200, status: 'paid', paid_at: '2026-01-20T00:00:00Z' }),
      makeInvoice({ id: '3', total_amount: 50, status: 'paid', paid_at: '2026-03-10T00:00:00Z' }),
    ];

    const result = aggregateQuarterlyIncome(invoices, 2026);
    expect(result[0].monthlyBreakdown[0].income).toBe(300); // Jan
    expect(result[0].monthlyBreakdown[1].income).toBe(0);   // Feb
    expect(result[0].monthlyBreakdown[2].income).toBe(50);  // Mar
  });
});

describe('calculateSetAside', () => {
  const quarterlyIncome = [
    { quarter: 1, label: 'Q1', months: [1, 2, 3], income: 10000, monthlyBreakdown: [] },
    { quarter: 2, label: 'Q2', months: [4, 5, 6], income: 8000, monthlyBreakdown: [] },
    { quarter: 3, label: 'Q3', months: [7, 8, 9], income: 0, monthlyBreakdown: [] },
    { quarter: 4, label: 'Q4', months: [10, 11, 12], income: 12000, monthlyBreakdown: [] },
  ];

  it('calculates percent-based set-aside', () => {
    const result = calculateSetAside(quarterlyIncome as any, 'percent', 30, 0);
    expect(result[0].amount).toBe(3000);  // 30% of 10000
    expect(result[1].amount).toBe(2400);  // 30% of 8000
    expect(result[2].amount).toBe(0);     // 30% of 0
    expect(result[3].amount).toBe(3600);  // 30% of 12000
  });

  it('calculates fixed monthly set-aside (3 months per quarter)', () => {
    const result = calculateSetAside(quarterlyIncome as any, 'fixed', 0, 500);
    expect(result[0].amount).toBe(1500); // 500 * 3
    expect(result[1].amount).toBe(1500);
    expect(result[2].amount).toBe(1500);
    expect(result[3].amount).toBe(1500);
});

describe('estimateSelfEmploymentTax', () => {
  it('returns zero for zero income', () => {
    const result = estimateSelfEmploymentTax(0);
    expect(result.total).toBe(0);
    expect(result.deductibleHalf).toBe(0);
  });

  it('computes SE tax correctly for typical income', () => {
    const result = estimateSelfEmploymentTax(100000);
    // taxableBase = 100000 * 0.9235 = 92350
    // SS = 92350 * 0.124 = 11451.40
    // Medicare = 92350 * 0.029 = 2678.15
    // Total = 14129.55
    expect(result.socialSecurity).toBe(11451.40);
    expect(result.medicare).toBe(2678.15);
    expect(result.total).toBe(14129.55);
    expect(result.deductibleHalf).toBe(7064.78);
  });

  it('caps Social Security at wage base', () => {
    const result = estimateSelfEmploymentTax(300000);
    // taxableBase = 300000 * 0.9235 = 277050
    // SS capped at 174900 * 0.124 = 21687.60
    const expectedSS = Math.round(174900 * 0.124 * 100) / 100;
    expect(result.socialSecurity).toBe(expectedSS);
  });
});

describe('estimateFederalIncomeTax', () => {
  it('returns zero for income below standard deduction', () => {
    const tax = estimateFederalIncomeTax(10000, 'single');
    expect(tax).toBe(0);
  });

  it('computes tax for single filer with moderate income', () => {
    const tax = estimateFederalIncomeTax(80000, 'single', undefined, 0);
    // After standard deduction: 80000 - 15700 = 64300
    // 10% on first 11925 = 1192.50
    // 12% on next (48475-11925)=36550 = 4386
    // 22% on next (64300-48475)=15825 = 3481.50
    // Total = 9060
    expect(tax).toBe(9060);
  });
});

describe('estimateTotalTax', () => {
  it('computes full estimate with deductions', () => {
    const est = estimateTotalTax(120000, 'single', 20000);
    // Net = 100000
    expect(est.grossIncome).toBe(120000);
    expect(est.businessDeductions).toBe(20000);
    expect(est.netIncome).toBe(100000);
    expect(est.selfEmploymentTax).toBeGreaterThan(0);
    expect(est.federalIncomeTax).toBeGreaterThan(0);
    expect(est.totalEstimatedTax).toBe(est.selfEmploymentTax + est.federalIncomeTax);
    expect(est.effectiveRate).toBeGreaterThan(0);
    expect(est.quarterlyPayment).toBeCloseTo(est.totalEstimatedTax / 4, 1);
  });

  it('handles zero income', () => {
    const est = estimateTotalTax(0, 'single');
    expect(est.totalEstimatedTax).toBe(0);
    expect(est.effectiveRate).toBe(0);
  });
});

describe('estimateQuarterlyPayments', () => {
  it('distributes proportionally by quarter income', () => {
    const qi = [
      { quarter: 1, label: 'Q1', months: [1,2,3], income: 10000, monthlyBreakdown: [] },
      { quarter: 2, label: 'Q2', months: [4,5,6], income: 30000, monthlyBreakdown: [] },
      { quarter: 3, label: 'Q3', months: [7,8,9], income: 0, monthlyBreakdown: [] },
      { quarter: 4, label: 'Q4', months: [10,11,12], income: 10000, monthlyBreakdown: [] },
    ];
    const result = estimateQuarterlyPayments(10000, qi as any);
    expect(result[0].amount).toBe(2000);  // 10k/50k * 10000
    expect(result[1].amount).toBe(6000);  // 30k/50k * 10000
    expect(result[2].amount).toBe(0);
    expect(result[3].amount).toBe(2000);
  });

  it('splits evenly when no income', () => {
    const qi = [
      { quarter: 1, label: 'Q1', months: [1,2,3], income: 0, monthlyBreakdown: [] },
      { quarter: 2, label: 'Q2', months: [4,5,6], income: 0, monthlyBreakdown: [] },
      { quarter: 3, label: 'Q3', months: [7,8,9], income: 0, monthlyBreakdown: [] },
      { quarter: 4, label: 'Q4', months: [10,11,12], income: 0, monthlyBreakdown: [] },
    ];
    const result = estimateQuarterlyPayments(8000, qi as any);
    result.forEach(r => expect(r.amount).toBe(2000));
  });
});

  it('handles zero percent', () => {
    const result = calculateSetAside(quarterlyIncome as any, 'percent', 0, 0);
    result.forEach((r) => expect(r.amount).toBe(0));
  });
});
