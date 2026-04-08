import { describe, it, expect } from 'vitest';
import {
  aggregateQuarterlyIncome,
  calculateSetAside,
  estimateSelfEmploymentTax,
  estimateFederalIncomeTax,
  estimateTotalTax,
  estimateQuarterlyPayments,
  estimateQuarterlyInstallments,
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

function makeQI(incomes: number[]) {
  return incomes.map((income, i) => ({
    quarter: i + 1,
    label: `Q${i + 1}`,
    months: [i * 3 + 1, i * 3 + 2, i * 3 + 3],
    income,
    monthlyBreakdown: [],
  }));
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
    expect(result[0].income).toBe(3000);
    expect(result[1].income).toBe(500);
    expect(result[2].income).toBe(0);
    expect(result[3].income).toBe(3000);
  });

  it('ignores non-paid invoices', () => {
    const invoices: Invoice[] = [
      makeInvoice({ id: '1', total_amount: 5000, status: 'sent', paid_at: null }),
      makeInvoice({ id: '2', total_amount: 800, status: 'paid', paid_at: '2026-03-01T00:00:00Z' }),
    ];
    const result = aggregateQuarterlyIncome(invoices, 2026);
    expect(result[0].income).toBe(800);
  });

  it('ignores invoices from different years', () => {
    const invoices: Invoice[] = [
      makeInvoice({ id: '1', total_amount: 1000, status: 'paid', paid_at: '2025-06-15T00:00:00Z' }),
      makeInvoice({ id: '2', total_amount: 2000, status: 'paid', paid_at: '2026-06-15T00:00:00Z' }),
    ];
    const result = aggregateQuarterlyIncome(invoices, 2026);
    expect(result.reduce((s, q) => s + q.income, 0)).toBe(2000);
  });

  it('provides monthly breakdown', () => {
    const invoices: Invoice[] = [
      makeInvoice({ id: '1', total_amount: 100, status: 'paid', paid_at: '2026-01-05T00:00:00Z' }),
      makeInvoice({ id: '2', total_amount: 200, status: 'paid', paid_at: '2026-01-20T00:00:00Z' }),
      makeInvoice({ id: '3', total_amount: 50, status: 'paid', paid_at: '2026-03-10T00:00:00Z' }),
    ];
    const result = aggregateQuarterlyIncome(invoices, 2026);
    expect(result[0].monthlyBreakdown[0].income).toBe(300);
    expect(result[0].monthlyBreakdown[1].income).toBe(0);
    expect(result[0].monthlyBreakdown[2].income).toBe(50);
  });
});

describe('calculateSetAside', () => {
  const qi = makeQI([10000, 8000, 0, 12000]);

  it('calculates percent-based set-aside', () => {
    const result = calculateSetAside(qi as any, 'percent', 30, 0);
    expect(result[0].amount).toBe(3000);
    expect(result[1].amount).toBe(2400);
    expect(result[2].amount).toBe(0);
    expect(result[3].amount).toBe(3600);
  });

  it('calculates fixed monthly set-aside', () => {
    const result = calculateSetAside(qi as any, 'fixed', 0, 500);
    result.forEach(r => expect(r.amount).toBe(1500));
  });

  it('handles zero percent', () => {
    const result = calculateSetAside(qi as any, 'percent', 0, 0);
    result.forEach(r => expect(r.amount).toBe(0));
  });
});

describe('estimateSelfEmploymentTax', () => {
  it('returns zero for zero income', () => {
    const result = estimateSelfEmploymentTax(0);
    expect(result.total).toBe(0);
    expect(result.deductibleHalf).toBe(0);
  });

  it('computes SE tax correctly for typical income', () => {
    const result = estimateSelfEmploymentTax(100000);
    expect(result.socialSecurity).toBe(11451.40);
    expect(result.medicare).toBe(2678.15);
    expect(result.total).toBe(14129.55);
    expect(result.deductibleHalf).toBe(7064.78);
  });

  it('caps Social Security at wage base', () => {
    const result = estimateSelfEmploymentTax(300000);
    const expectedSS = Math.round(184500 * 0.124 * 100) / 100;
    expect(result.socialSecurity).toBe(expectedSS);
  });
});

describe('estimateFederalIncomeTax', () => {
  it('returns zero for income below standard deduction', () => {
    expect(estimateFederalIncomeTax(10000, 'single')).toBe(0);
  });

  it('computes tax for single filer with moderate income', () => {
    const tax = estimateFederalIncomeTax(80000, 'single', undefined, 0);
    expect(tax).toBe(8770);
  });
});

describe('estimateTotalTax', () => {
  it('computes full estimate with deductions', () => {
    const est = estimateTotalTax(120000, 'single', 20000);
    expect(est.netIncome).toBe(100000);
    expect(est.totalEstimatedTax).toBe(est.selfEmploymentTax + est.federalIncomeTax);
    expect(est.effectiveRate).toBeGreaterThan(0);
  });

  it('handles zero income', () => {
    const est = estimateTotalTax(0, 'single');
    expect(est.totalEstimatedTax).toBe(0);
  });
});

describe('estimateQuarterlyPayments', () => {
  it('distributes proportionally by quarter income', () => {
    const qi = makeQI([10000, 30000, 0, 10000]);
    const result = estimateQuarterlyPayments(10000, qi as any);
    expect(result[0].amount).toBe(2000);
    expect(result[1].amount).toBe(6000);
    expect(result[2].amount).toBe(0);
    expect(result[3].amount).toBe(2000);
  });

  it('splits evenly when no income', () => {
    const qi = makeQI([0, 0, 0, 0]);
    const result = estimateQuarterlyPayments(8000, qi as any);
    result.forEach(r => expect(r.amount).toBe(2000));
  });
});

describe('estimateQuarterlyInstallments (annualized method)', () => {
  it('produces four quarterly installments', () => {
    const qi = makeQI([25000, 25000, 25000, 25000]);
    const result = estimateQuarterlyInstallments(qi as any, 'single', 0);
    expect(result).toHaveLength(4);
    result.forEach(r => {
      expect(r.installmentPayment).toBeGreaterThanOrEqual(0);
      expect(r.quarter).toBeGreaterThanOrEqual(1);
    });
  });

  it('total installments equal full-year tax for even income', () => {
    const qi = makeQI([25000, 25000, 25000, 25000]);
    const result = estimateQuarterlyInstallments(qi as any, 'single', 0);
    const totalInstallments = result.reduce((s, r) => s + r.installmentPayment, 0);
    const fullYear = estimateTotalTax(100000, 'single', 0);
    // Should be very close to full year tax
    expect(Math.abs(totalInstallments - fullYear.totalEstimatedTax)).toBeLessThan(1);
  });

  it('front-loads payments when income is front-loaded', () => {
    const qi = makeQI([80000, 10000, 5000, 5000]);
    const result = estimateQuarterlyInstallments(qi as any, 'single', 0);
    // Q1 payment should be the largest
    expect(result[0].installmentPayment).toBeGreaterThan(result[3].installmentPayment);
  });

  it('handles zero income', () => {
    const qi = makeQI([0, 0, 0, 0]);
    const result = estimateQuarterlyInstallments(qi as any, 'single', 0);
    result.forEach(r => expect(r.installmentPayment).toBe(0));
  });

  it('never produces negative installments', () => {
    // Income drops after Q1 — annualization could theoretically produce negative
    const qi = makeQI([50000, 5000, 5000, 5000]);
    const result = estimateQuarterlyInstallments(qi as any, 'single', 0);
    result.forEach(r => expect(r.installmentPayment).toBeGreaterThanOrEqual(0));
  });

  it('cumulative income builds correctly', () => {
    const qi = makeQI([10000, 20000, 30000, 40000]);
    const result = estimateQuarterlyInstallments(qi as any, 'single', 0);
    expect(result[0].cumulativeIncome).toBe(10000);
    expect(result[1].cumulativeIncome).toBe(30000);
    expect(result[2].cumulativeIncome).toBe(60000);
    expect(result[3].cumulativeIncome).toBe(100000);
  });
});
