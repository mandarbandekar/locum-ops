import { describe, it, expect } from 'vitest';
import { calculateTaxV1, mapDbProfileToV1 } from '@/lib/taxCalculatorV1';

/**
 * Regression test suite for taxCalculatorV1.
 *
 * The expected values in this file were locked in after Prompt 4A
 * (other_w2_income wiring + QBI deduction + PTET handling) was verified
 * manually. If a test fails, do NOT update the expected value to match the
 * new output without first hand-verifying that the new output is correct.
 * The tests exist to catch unintended math regressions in subsequent prompts
 * (4B safe harbor, 4C projection engine, etc.).
 */

function makeProfile(overrides: Record<string, any>) {
  const baseDbProfile = {
    entity_type: 'sole_prop',
    filing_status: 'single',
    state_code: 'TX',
    annual_relief_income: 0,
    annual_business_expenses: 0,
    other_w2_income: 0,
    spouse_w2_income: 0,
    spouse_se_net_income: 0,
    spouse_has_se_income: false,
    retirement_contribution: 0,
    pte_elected: false,
    scorp_salary: 0,
    extra_withholding: 0,
    work_states: [],
    ...overrides,
  };
  const v1 = mapDbProfileToV1(baseDbProfile as any);
  // Force deterministic date so all 4 quarters remain (Jan 15 is before Apr 15).
  // This keeps existing test expectations (quarterlyPayment = annual / 4) stable.
  v1.today = new Date('2026-01-15T12:00:00');
  return v1;
}

describe('taxCalculatorV1 — other_w2_income wiring', () => {
  it('Case A: $60K W-2 + $80K SE income produces correct AGI, SS tax, and federal tax', () => {
    const profile = makeProfile({
      filing_status: 'single',
      state_code: 'TX',
      annual_relief_income: 90000,
      annual_business_expenses: 10000,
      other_w2_income: 60000,
    });
    const result: any = calculateTaxV1(profile);

    expect(result.path).toBe('1099');
    expect(result.netIncome).toBeCloseTo(80000, -1);
    expect(result.ssTax).toBeCloseTo(9161, -1);
    expect(result.agi).toBeCloseTo(134348, -1);
    expect(result.totalFederalTax).toBeCloseTo(17207, -1);
  });

  it('Case B (baseline): same vet without W-2 produces materially lower federal tax', () => {
    const profile = makeProfile({
      filing_status: 'single',
      state_code: 'TX',
      annual_relief_income: 90000,
      annual_business_expenses: 10000,
      other_w2_income: 0,
    });
    const result: any = calculateTaxV1(profile);

    expect(result.totalFederalTax).toBeCloseTo(5344, -1);
  });

  it('A vs B delta: federal tax should rise by ~$11,800 when $60K W-2 is added', () => {
    const withW2: any = calculateTaxV1(makeProfile({
      filing_status: 'single',
      state_code: 'TX',
      annual_relief_income: 90000,
      annual_business_expenses: 10000,
      other_w2_income: 60000,
    }));
    const withoutW2: any = calculateTaxV1(makeProfile({
      filing_status: 'single',
      state_code: 'TX',
      annual_relief_income: 90000,
      annual_business_expenses: 10000,
      other_w2_income: 0,
    }));
    const delta = withW2.totalFederalTax - withoutW2.totalFederalTax;
    expect(delta).toBeGreaterThan(10000);
    expect(delta).toBeLessThan(13000);
  });
});

describe('taxCalculatorV1 — QBI deduction (Section 199A, SSTB)', () => {
  it('Case C: median single vet ($130K relief, $15K expenses) — taxable-income cap binds', () => {
    const profile = makeProfile({
      filing_status: 'single',
      state_code: 'TX',
      annual_relief_income: 130000,
      annual_business_expenses: 15000,
    });
    const result: any = calculateTaxV1(profile);

    expect(result.qbiAmount).toBe(115000);
    expect(result.qbiDeduction).toBeCloseTo(18155, -1);
    expect(result.quarterlyPayment).toBeCloseTo(6734, -1);
  });

  it('Case D: $400K MFJ — still below $403.5K MFJ threshold, full QBI applies', () => {
    const profile = makeProfile({
      filing_status: 'married_joint',
      state_code: 'TX',
      annual_relief_income: 400000,
      annual_business_expenses: 30000,
    });
    const result: any = calculateTaxV1(profile);

    expect(result.qbiAmount).toBe(370000);
    expect(result.qbiDeduction).toBeCloseTo(64199, -2);
    expect(result.qbiDeduction).toBeGreaterThan(0);
  });

  it('Case D2: $700K MFJ relief income — fully phased out, qbiDeduction = 0', () => {
    const profile = makeProfile({
      filing_status: 'married_joint',
      state_code: 'TX',
      annual_relief_income: 700000,
      annual_business_expenses: 30000,
    });
    const result: any = calculateTaxV1(profile);

    expect(result.qbiAmount).toBe(670000);
    expect(result.qbiDeduction).toBe(0);
  });

  it('Case E: $250K MFJ — below threshold, full 20% deduction with cap', () => {
    const profile = makeProfile({
      filing_status: 'married_joint',
      state_code: 'TX',
      annual_relief_income: 250000,
      annual_business_expenses: 10000,
    });
    const result: any = calculateTaxV1(profile);

    expect(result.qbiAmount).toBe(240000);
    // Hand-verified: net $240K, SE ded ~$16,950, AGI ~$223,050, MFJ stdDed $32,300
    // → taxable-before-QBI ~$190,750, 20% cap = ~$38,150 (binds below base 20% of $240K = $48,000).
    // Prompt's original $40K–$48K range was miscomputed; actual $38,629 reflects the cap.
    expect(result.qbiDeduction).toBeGreaterThan(36000);
    expect(result.qbiDeduction).toBeLessThan(40000);
  });

  it('Result object shape: 1099 path includes qbiAmount, qbiDeduction', () => {
    const profile = makeProfile({
      annual_relief_income: 100000,
      annual_business_expenses: 5000,
    });
    const result: any = calculateTaxV1(profile);
    expect(result).toHaveProperty('qbiAmount');
    expect(result).toHaveProperty('qbiDeduction');
    expect(typeof result.qbiAmount).toBe('number');
    expect(typeof result.qbiDeduction).toBe('number');
  });
});

describe('taxCalculatorV1 — PTET (CA S-Corp only)', () => {
  it('Case G: CA S-Corp with PTET elected — ptetPaid set, CA state tax zeroed', () => {
    const profile = makeProfile({
      entity_type: 'scorp',
      filing_status: 'single',
      state_code: 'CA',
      annual_relief_income: 200000,
      annual_business_expenses: 20000,
      scorp_salary: 80000,
      pte_elected: true,
    });
    const result: any = calculateTaxV1(profile);

    expect(result.path).toBe('scorp');
    expect(result.ptetEligible).toBe(true);
    expect(result.ptetPaid).toBeCloseTo(16740, -1);
    expect(result.stateTax).toBe(0);
  });

  it('Case G vs no-PTET: federal tax savings ~$4,000 when PTET is elected', () => {
    const baseProfile = {
      entity_type: 'scorp',
      filing_status: 'single',
      state_code: 'CA',
      annual_relief_income: 200000,
      annual_business_expenses: 20000,
      scorp_salary: 80000,
    };
    const withPtet: any = calculateTaxV1(makeProfile({ ...baseProfile, pte_elected: true }));
    const withoutPtet: any = calculateTaxV1(makeProfile({ ...baseProfile, pte_elected: false }));

    const fedSavings = withoutPtet.totalFederalTax - withPtet.totalFederalTax;
    expect(fedSavings).toBeGreaterThan(3000);
    expect(fedSavings).toBeLessThan(5500);
  });

  it('Case H: TX S-Corp with pte_elected=true — PTET ignored (state must be CA)', () => {
    const profile = makeProfile({
      entity_type: 'scorp',
      filing_status: 'single',
      state_code: 'TX',
      annual_relief_income: 200000,
      annual_business_expenses: 20000,
      scorp_salary: 80000,
      pte_elected: true,
    });
    const result: any = calculateTaxV1(profile);

    expect(result.ptetEligible).toBe(false);
    expect(result.ptetPaid).toBe(0);
  });

  it('Case I: CA sole prop with pte_elected=true — PTET ignored (entity must be S-Corp)', () => {
    const profile = makeProfile({
      entity_type: 'sole_prop',
      filing_status: 'single',
      state_code: 'CA',
      annual_relief_income: 200000,
      annual_business_expenses: 20000,
      pte_elected: true,
    });
    const result: any = calculateTaxV1(profile);

    expect(result.path).toBe('1099');
    expect(result.ptetEligible).toBe(false);
    expect(result.ptetPaid).toBe(0);
  });

  it('Result object shape: S-Corp result includes ptetPaid, ptetEligible', () => {
    const profile = makeProfile({
      entity_type: 'scorp',
      filing_status: 'single',
      state_code: 'CA',
      annual_relief_income: 150000,
      annual_business_expenses: 10000,
      scorp_salary: 60000,
    });
    const result: any = calculateTaxV1(profile);
    expect(result).toHaveProperty('ptetPaid');
    expect(result).toHaveProperty('ptetEligible');
    expect(typeof result.ptetEligible).toBe('boolean');
  });
});

describe('taxCalculatorV1 — result shape contract', () => {
  it('1099 result includes all expected top-level fields', () => {
    const result: any = calculateTaxV1(makeProfile({
      annual_relief_income: 100000,
      annual_business_expenses: 5000,
    }));
    const requiredFields = [
      'path', 'grossIncome', 'expenses', 'netIncome',
      'seBase', 'ssTax', 'medicareTax', 'totalSeTax', 'seDeduction',
      'agi', 'federalTaxableIncome', 'totalFederalTax',
      'stateTax', 'annualEstimatedTaxDue', 'quarterlyPayment',
      'marginalRate', 'effectiveRate', 'setAsideRate',
      'qbiAmount', 'qbiDeduction', 'ptetPaid', 'ptetEligible',
    ];
    for (const f of requiredFields) {
      expect(result).toHaveProperty(f);
    }
  });

  it('S-Corp result includes all expected top-level fields', () => {
    const result: any = calculateTaxV1(makeProfile({
      entity_type: 'scorp',
      annual_relief_income: 200000,
      annual_business_expenses: 20000,
      scorp_salary: 80000,
    }));
    const requiredFields = [
      'path', 'grossRevenue', 'salary', 'distribution',
      'agi', 'totalFederalTax', 'stateTax',
      'annualEstimatedTaxDue', 'quarterlyPayment',
      'qbiAmount', 'qbiDeduction', 'ptetPaid', 'ptetEligible',
    ];
    for (const f of requiredFields) {
      expect(result).toHaveProperty(f);
    }
  });

  it('Empty profile produces a zero result (no crash)', () => {
    const result: any = calculateTaxV1(makeProfile({}));
    expect(result.netIncome).toBe(0);
    expect(result.annualEstimatedTaxDue).toBe(0);
    expect(result.quarterlyPayment).toBe(0);
  });
});

describe('taxCalculatorV1 — safe harbor', () => {
  it('SH-A: First-year vet — safe harbor unavailable, recommended = current year', () => {
    const profile = makeProfile({
      filing_status: 'single',
      state_code: 'TX',
      annual_relief_income: 100000,
      annual_business_expenses: 10000,
    });
    const result: any = calculateTaxV1(profile);

    expect(result.safeHarborAvailable).toBe(false);
    expect(result.safeHarborAnnual).toBe(0);
    expect(result.recommendationReason).toBe('first_year_only_current_year_available');
    expect(result.recommendedAnnual).toBe(result.currentYearEstimate);
  });

  it('SH-B: Income up YoY — current year higher, recommend current year', () => {
    const profile = makeProfile({
      filing_status: 'single',
      state_code: 'TX',
      annual_relief_income: 150000,
      annual_business_expenses: 10000,
      prior_year_tax_paid: 15000,
      prior_year_agi: 100000,
    });
    const result: any = calculateTaxV1(profile);

    expect(result.safeHarborAvailable).toBe(true);
    expect(result.safeHarborMultiplier).toBe(1.0);
    expect(result.safeHarborAnnual).toBe(15000);
    expect(result.currentYearEstimate).toBeGreaterThan(15000);
    expect(result.recommendationReason).toBe('income_up_yoy_current_year_higher');
    expect(result.recommendedAnnual).toBe(result.currentYearEstimate);
  });

  it('SH-C: Income down YoY — safe harbor higher, recommend safe harbor', () => {
    const profile = makeProfile({
      filing_status: 'single',
      state_code: 'TX',
      annual_relief_income: 60000,
      annual_business_expenses: 5000,
      prior_year_tax_paid: 30000,
      prior_year_agi: 140000,
    });
    const result: any = calculateTaxV1(profile);

    expect(result.safeHarborAvailable).toBe(true);
    expect(result.safeHarborAnnual).toBe(30000);
    expect(result.currentYearEstimate).toBeLessThan(30000);
    expect(result.recommendationReason).toBe('income_down_yoy_safe_harbor_higher');
    expect(result.recommendedAnnual).toBe(30000);
  });

  it('SH-D: High-income prior year (AGI > $150K) — 110% multiplier applied', () => {
    const profile = makeProfile({
      filing_status: 'single',
      state_code: 'TX',
      annual_relief_income: 100000,
      annual_business_expenses: 5000,
      prior_year_tax_paid: 40000,
      prior_year_agi: 200000,
    });
    const result: any = calculateTaxV1(profile);

    expect(result.safeHarborMultiplier).toBe(1.1);
    expect(result.safeHarborAnnual).toBe(44000);
    expect(result.recommendationReason).toBe('income_down_yoy_safe_harbor_higher');
  });

  it('SH-E: AGI exactly at $150K — uses 100% (threshold is "more than", not "at least")', () => {
    const profile = makeProfile({
      prior_year_tax_paid: 20000,
      prior_year_agi: 150000,
    });
    const result: any = calculateTaxV1(profile);

    expect(result.safeHarborMultiplier).toBe(1.0);
    expect(result.safeHarborAnnual).toBe(20000);
  });
});

describe('taxCalculatorV1 — remaining quarters and YTD payments', () => {
  it('RQ-A: January — all 4 quarters remain, no payments made, quarterly = annual / 4', () => {
    const profile = makeProfile({
      annual_relief_income: 100000,
      annual_business_expenses: 10000,
    });
    profile.today = new Date('2026-01-15T12:00:00');
    const result: any = calculateTaxV1(profile);

    expect(result.quartersRemaining).toBe(4);
    expect(result.ytdPaymentsTotal).toBe(0);
    expect(result.quarterlyPayment).toBe(Math.round(result.recommendedAnnual / 4));
    expect(result.nextDueDate).toBe('2026-04-15');
  });

  it('RQ-B: July — Q3 and Q4 remain, Q1+Q2 paid, quarterly = (remaining) / 2', () => {
    const profile = makeProfile({
      annual_relief_income: 120000,
      annual_business_expenses: 10000,
      q1_estimated_payment: 4000,
      q2_estimated_payment: 4000,
    });
    profile.today = new Date('2026-07-01T12:00:00');
    const result: any = calculateTaxV1(profile);

    expect(result.quartersRemaining).toBe(2);
    expect(result.ytdPaymentsTotal).toBe(8000);
    expect(result.recommendedRemaining).toBe(Math.max(0, result.recommendedAnnual - 8000));
    expect(result.quarterlyPayment).toBe(Math.round(result.recommendedRemaining / 2));
    expect(result.nextDueDate).toBe('2026-09-15');
  });

  it('RQ-C: Mid-November — Q4 only remains, ALL prior quarters paid', () => {
    const profile = makeProfile({
      annual_relief_income: 150000,
      annual_business_expenses: 10000,
      q1_estimated_payment: 5000,
      q2_estimated_payment: 5000,
      q3_estimated_payment: 5000,
    });
    profile.today = new Date('2026-11-15T12:00:00');
    const result: any = calculateTaxV1(profile);

    expect(result.quartersRemaining).toBe(1);
    expect(result.ytdPaymentsTotal).toBe(15000);
    expect(result.nextDueDate).toBe('2027-01-15');
    expect(result.quarterlyPayment).toBe(result.recommendedRemaining);
  });

  it('RQ-D: Early February — all 4 of current year quarters remain', () => {
    const profile = makeProfile({
      annual_relief_income: 100000,
      annual_business_expenses: 10000,
    });
    profile.today = new Date('2026-02-01T12:00:00');
    const result: any = calculateTaxV1(profile);

    expect(result.quartersRemaining).toBe(4);
    expect(result.nextDueDate).toBe('2026-04-15');
  });

  it('RQ-E: Already overpaid — recommendedRemaining clamps to 0, quarterlyPayment = 0', () => {
    const profile = makeProfile({
      annual_relief_income: 80000,
      annual_business_expenses: 5000,
      q1_estimated_payment: 50000,
    });
    profile.today = new Date('2026-07-01T12:00:00');
    const result: any = calculateTaxV1(profile);

    expect(result.recommendedRemaining).toBe(0);
    expect(result.quarterlyPayment).toBe(0);
  });
});
