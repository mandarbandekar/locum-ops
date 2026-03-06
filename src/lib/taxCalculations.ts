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
