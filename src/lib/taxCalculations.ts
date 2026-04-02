import { Invoice } from '@/types';

export interface QuarterlyIncome {
  quarter: number;
  label: string;
  months: number[];
  income: number;
  monthlyBreakdown: { month: number; monthLabel: string; income: number }[];
}

export interface SetAsideResult {
  quarter: number;
  amount: number;
}

const QUARTER_MONTHS: Record<number, number[]> = {
  1: [1, 2, 3],
  2: [4, 5, 6],
  3: [7, 8, 9],
  4: [10, 11, 12],
};

const QUARTER_LABELS: Record<number, string> = {
  1: 'Q1 (Jan–Mar)',
  2: 'Q2 (Apr–Jun)',
  3: 'Q3 (Jul–Sep)',
  4: 'Q4 (Oct–Dec)',
};

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Standard US quarterly estimated tax due dates for a given year.
 */
export function getDefaultDueDates(year: number): Record<number, string> {
  return {
    1: `${year}-04-15`,
    2: `${year}-06-15`,
    3: `${year}-09-15`,
    4: `${year + 1}-01-15`,
  };
}

/**
 * Aggregate paid invoices by quarter for a given tax year.
 * Uses the paid_at date to determine which quarter/year the income belongs to.
 */
export function aggregateQuarterlyIncome(invoices: Invoice[], taxYear: number): QuarterlyIncome[] {
  const paidInvoices = invoices.filter(
    (inv) => inv.status === 'paid' && inv.paid_at
  );

  return [1, 2, 3, 4].map((quarter) => {
    const months = QUARTER_MONTHS[quarter];
    const monthlyBreakdown = months.map((month) => {
      const monthIncome = paidInvoices
        .filter((inv) => {
          const d = new Date(inv.paid_at!);
          return d.getFullYear() === taxYear && d.getMonth() + 1 === month;
        })
        .reduce((sum, inv) => sum + inv.total_amount, 0);
      return { month, monthLabel: MONTH_LABELS[month - 1], income: monthIncome };
    });

    const income = monthlyBreakdown.reduce((sum, m) => sum + m.income, 0);

    return {
      quarter,
      label: QUARTER_LABELS[quarter],
      months,
      income,
      monthlyBreakdown,
    };
  });
}

/**
 * Calculate set-aside amounts per quarter.
 * - percent mode: set_aside_percent / 100 * quarter income
 * - fixed mode: set_aside_fixed_monthly * 3 (months per quarter)
 */
export function calculateSetAside(
  quarterlyIncome: QuarterlyIncome[],
  mode: 'percent' | 'fixed',
  percent: number,
  fixedMonthly: number
): SetAsideResult[] {
  return quarterlyIncome.map((q) => ({
    quarter: q.quarter,
    amount:
      mode === 'percent'
        ? Math.round((percent / 100) * q.income * 100) / 100
        : Math.round(fixedMonthly * 3 * 100) / 100,
  }));
}

// ── Tax Estimation ──────────────────────────────────────────────

export type FilingStatus = 'single' | 'married_joint' | 'married_separate' | 'head_of_household';

const FILING_STATUS_LABELS: Record<FilingStatus, string> = {
  single: 'Single',
  married_joint: 'Married Filing Jointly',
  married_separate: 'Married Filing Separately',
  head_of_household: 'Head of Household',
};

export { FILING_STATUS_LABELS };

// 2026 standard deductions (projected / approximate)
const STANDARD_DEDUCTIONS: Record<FilingStatus, number> = {
  single: 15700,
  married_joint: 31400,
  married_separate: 15700,
  head_of_household: 23500,
};

// 2026 federal marginal brackets (projected)
const BRACKETS: Record<FilingStatus, { limit: number; rate: number }[]> = {
  single: [
    { limit: 11925, rate: 0.10 },
    { limit: 48475, rate: 0.12 },
    { limit: 103350, rate: 0.22 },
    { limit: 197300, rate: 0.24 },
    { limit: 250525, rate: 0.32 },
    { limit: 626350, rate: 0.35 },
    { limit: Infinity, rate: 0.37 },
  ],
  married_joint: [
    { limit: 23850, rate: 0.10 },
    { limit: 96950, rate: 0.12 },
    { limit: 206700, rate: 0.22 },
    { limit: 394600, rate: 0.24 },
    { limit: 501050, rate: 0.32 },
    { limit: 751600, rate: 0.35 },
    { limit: Infinity, rate: 0.37 },
  ],
  married_separate: [
    { limit: 11925, rate: 0.10 },
    { limit: 48475, rate: 0.12 },
    { limit: 103350, rate: 0.22 },
    { limit: 197300, rate: 0.24 },
    { limit: 250525, rate: 0.32 },
    { limit: 375800, rate: 0.35 },
    { limit: Infinity, rate: 0.37 },
  ],
  head_of_household: [
    { limit: 17000, rate: 0.10 },
    { limit: 64850, rate: 0.12 },
    { limit: 103350, rate: 0.22 },
    { limit: 197300, rate: 0.24 },
    { limit: 250500, rate: 0.32 },
    { limit: 626350, rate: 0.35 },
    { limit: Infinity, rate: 0.37 },
  ],
};

const SS_WAGE_CAP_2026 = 174900; // projected 2026 SS wage base
const SE_TAX_RATE = 0.153; // 12.4% SS + 2.9% Medicare
const SE_TAXABLE_FACTOR = 0.9235; // 92.35% of net earnings subject to SE tax

/**
 * Estimate self-employment tax. Applies 92.35% factor, then 15.3% with SS wage cap.
 */
export function estimateSelfEmploymentTax(netIncome: number): { total: number; socialSecurity: number; medicare: number; deductibleHalf: number } {
  if (netIncome <= 0) return { total: 0, socialSecurity: 0, medicare: 0, deductibleHalf: 0 };
  const taxableBase = netIncome * SE_TAXABLE_FACTOR;
  const ssBase = Math.min(taxableBase, SS_WAGE_CAP_2026);
  const socialSecurity = round2(ssBase * 0.124);
  const medicare = round2(taxableBase * 0.029);
  const total = round2(socialSecurity + medicare);
  return { total, socialSecurity, medicare, deductibleHalf: round2(total / 2) };
}

/**
 * Estimate federal income tax using marginal brackets.
 * Subtracts standard deduction (or override) and the deductible half of SE tax.
 */
export function estimateFederalIncomeTax(
  netIncome: number,
  filingStatus: FilingStatus,
  deductionOverride?: number,
  seTaxDeductibleHalf: number = 0,
): number {
  const standardDeduction = deductionOverride ?? STANDARD_DEDUCTIONS[filingStatus];
  const taxableIncome = Math.max(0, netIncome - standardDeduction - seTaxDeductibleHalf);
  const brackets = BRACKETS[filingStatus];

  let tax = 0;
  let prev = 0;
  for (const { limit, rate } of brackets) {
    if (taxableIncome <= prev) break;
    const bracketIncome = Math.min(taxableIncome, limit) - prev;
    tax += bracketIncome * rate;
    prev = limit;
  }
  return round2(tax);
}

export interface TaxEstimate {
  grossIncome: number;
  businessDeductions: number;
  netIncome: number;
  selfEmploymentTax: number;
  seTaxDeductibleHalf: number;
  federalIncomeTax: number;
  totalEstimatedTax: number;
  effectiveRate: number;
  quarterlyPayment: number;
}

/**
 * Full tax estimate from gross 1099 income.
 */
export function estimateTotalTax(
  grossIncome: number,
  filingStatus: FilingStatus,
  businessDeductions: number = 0,
): TaxEstimate {
  const netIncome = Math.max(0, grossIncome - businessDeductions);
  const se = estimateSelfEmploymentTax(netIncome);
  const federalIncomeTax = estimateFederalIncomeTax(netIncome, filingStatus, undefined, se.deductibleHalf);
  const totalEstimatedTax = round2(se.total + federalIncomeTax);
  const effectiveRate = grossIncome > 0 ? round2((totalEstimatedTax / grossIncome) * 100) : 0;
  const quarterlyPayment = round2(totalEstimatedTax / 4);

  return {
    grossIncome,
    businessDeductions,
    netIncome,
    selfEmploymentTax: se.total,
    seTaxDeductibleHalf: se.deductibleHalf,
    federalIncomeTax,
    totalEstimatedTax,
    effectiveRate,
    quarterlyPayment,
  };
}

/**
 * Distribute annual tax proportionally across quarters based on income distribution.
 */
export function estimateQuarterlyPayments(
  annualTax: number,
  quarterlyIncome: QuarterlyIncome[],
): { quarter: number; amount: number }[] {
  const totalIncome = quarterlyIncome.reduce((s, q) => s + q.income, 0);
  if (totalIncome === 0) {
    return quarterlyIncome.map(q => ({ quarter: q.quarter, amount: round2(annualTax / 4) }));
  }
  return quarterlyIncome.map(q => ({
    quarter: q.quarter,
    amount: round2((q.income / totalIncome) * annualTax),
  }));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Generate CSV content for accountant export.
 */
export function generateTaxExportCSV(
  taxYear: number,
  quarterlyData: QuarterlyIncome[],
  setAsideData: SetAsideResult[],
  setAsideMode: string,
  setAsidePercent: number,
  setAsideFixedMonthly: number,
  quarterStatuses: { quarter: number; due_date: string; status: string; notes: string }[]
): string {
  const lines: string[] = [];

  lines.push(`LocumOps Estimated Tax Summary — ${taxYear}`);
  lines.push('DISCLAIMER: Not tax advice. Confirm all amounts and dates with your accountant.');
  lines.push('');

  // Set-aside preference
  lines.push('Set-Aside Preference');
  if (setAsideMode === 'percent') {
    lines.push(`Mode,Percent of paid income`);
    lines.push(`Rate,${setAsidePercent}%`);
  } else {
    lines.push(`Mode,Fixed monthly`);
    lines.push(`Amount,$${setAsideFixedMonthly}/month`);
  }
  lines.push('');

  // Monthly breakdown
  lines.push('Monthly Paid Income');
  lines.push('Month,Amount');
  quarterlyData.forEach((q) => {
    q.monthlyBreakdown.forEach((m) => {
      lines.push(`${m.monthLabel} ${taxYear},${m.income.toFixed(2)}`);
    });
  });
  lines.push('');

  // Quarterly summary
  lines.push('Quarterly Summary');
  lines.push('Quarter,Paid Income,Set-Aside Amount,Due Date,Status,Notes');
  quarterlyData.forEach((q) => {
    const sa = setAsideData.find((s) => s.quarter === q.quarter);
    const qs = quarterStatuses.find((s) => s.quarter === q.quarter);
    lines.push(
      `${q.label},${q.income.toFixed(2)},${(sa?.amount ?? 0).toFixed(2)},${qs?.due_date ?? ''},${qs?.status ?? ''},"${(qs?.notes ?? '').replace(/"/g, '""')}"`
    );
  });

  // Annual total
  const totalIncome = quarterlyData.reduce((s, q) => s + q.income, 0);
  const totalSetAside = setAsideData.reduce((s, q) => s + q.amount, 0);
  lines.push(`Total,${totalIncome.toFixed(2)},${totalSetAside.toFixed(2)},,,`);

  return lines.join('\n');
}
