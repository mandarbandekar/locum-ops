// Pure builders for CPA Prep monthly exports + CSV serialization.
// Date handling avoids UTC drift by parsing YYYY-MM-DD strings directly.

import type { Expense } from '@/hooks/useExpenses';
import type { Facility, Invoice, Shift } from '@/types';
import { getShiftTotalRevenue } from '@/types';
import { EXPENSE_CATEGORIES } from '@/lib/expenseCategories';

export const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/** Parse YYYY-MM-DD or ISO date string -> month index 0-11 (clinic-local; no UTC shift). */
function monthOf(dateStr: string): number {
  if (!dateStr) return 0;
  const m = dateStr.slice(5, 7);
  return Math.max(0, Math.min(11, Number(m) - 1));
}
function yearOf(dateStr: string): number {
  if (!dateStr) return 0;
  return Number(dateStr.slice(0, 4));
}

const fmt = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtMiles = (n: number) => Math.round(n).toLocaleString('en-US');
const fmtRate = (cents: number) => `$${(cents / 100).toFixed(2)}`;

// ────────────────────────────────────────────────────────────────────────────
// Monthly Mileage
// ────────────────────────────────────────────────────────────────────────────
export interface MonthlyMileageRow {
  month: string;
  miles: number;
  rateCents: number;
  deductionCents: number;
}

export interface MonthlyMileageClinicRow {
  clinic: string;
  trips: number;
  miles: number;
  deductionCents: number;
}

export interface MileageTrip {
  date: string;          // YYYY-MM-DD
  place: string;         // clinic name (or vendor / "Unlinked trip")
  address: string;       // full address, may be ''
  miles: number;
  amountCents: number;
}

export interface MileageMonthLog {
  monthIndex: number;    // 0-11
  monthLabel: string;    // "January 2026"
  trips: MileageTrip[];
  subtotalMiles: number;
  subtotalAmountCents: number;
}

const FULL_MONTH_LABELS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

export function buildMileageTripLog(
  expenses: Expense[],
  facilities: Facility[],
  year: number,
  irsRateCents: number,
): MileageMonthLog[] {
  const facMap = new Map(facilities.map(f => [f.id, f]));
  const buckets: MileageMonthLog[] = new Array(12).fill(0).map((_, i) => ({
    monthIndex: i,
    monthLabel: `${FULL_MONTH_LABELS[i]} ${year}`,
    trips: [],
    subtotalMiles: 0,
    subtotalAmountCents: 0,
  }));

  expenses
    .filter(e => yearOf(e.expense_date) === year && (e.mileage_miles || 0) > 0)
    .forEach(e => {
      const fac = e.facility_id ? facMap.get(e.facility_id) : undefined;
      const place = fac?.name || e.vendor || 'Unlinked trip';
      const address = fac?.address || '';
      const miles = e.mileage_miles || 0;
      const amountCents = Math.round(miles * irsRateCents);
      const m = monthOf(e.expense_date);
      buckets[m].trips.push({ date: e.expense_date, place, address, miles, amountCents });
      buckets[m].subtotalMiles += miles;
      buckets[m].subtotalAmountCents += amountCents;
    });

  buckets.forEach(b => b.trips.sort((a, b) => a.date.localeCompare(b.date)));
  return buckets.filter(b => b.trips.length > 0);
}

export function buildMonthlyMileageRows(
  expenses: Expense[],
  year: number,
  irsRateCents: number,
): { rows: MonthlyMileageRow[]; totals: { miles: number; deductionCents: number } } {
  const buckets = new Array(12).fill(0).map(() => ({ miles: 0 }));
  expenses
    .filter(e => yearOf(e.expense_date) === year)
    .forEach(e => {
      buckets[monthOf(e.expense_date)].miles += e.mileage_miles || 0;
    });
  const rows: MonthlyMileageRow[] = buckets.map((b, i) => ({
    month: MONTH_LABELS[i],
    miles: b.miles,
    rateCents: irsRateCents,
    deductionCents: Math.round(b.miles * irsRateCents),
  }));
  const totals = {
    miles: rows.reduce((s, r) => s + r.miles, 0),
    deductionCents: rows.reduce((s, r) => s + r.deductionCents, 0),
  };
  return { rows, totals };
}

export function buildMonthlyMileageByClinic(
  expenses: Expense[],
  facilities: Facility[],
  year: number,
  irsRateCents: number,
): Record<number, MonthlyMileageClinicRow[]> {
  const facMap = new Map(facilities.map(f => [f.id, f.name]));
  const out: Record<number, Record<string, MonthlyMileageClinicRow>> = {};
  expenses
    .filter(e => yearOf(e.expense_date) === year && (e.mileage_miles || 0) > 0)
    .forEach(e => {
      const m = monthOf(e.expense_date);
      const name = (e.facility_id && facMap.get(e.facility_id)) || 'Unassigned';
      if (!out[m]) out[m] = {};
      if (!out[m][name]) out[m][name] = { clinic: name, trips: 0, miles: 0, deductionCents: 0 };
      out[m][name].trips += 1;
      out[m][name].miles += e.mileage_miles || 0;
    });
  const result: Record<number, MonthlyMileageClinicRow[]> = {};
  Object.entries(out).forEach(([m, rec]) => {
    const arr = Object.values(rec);
    arr.forEach(r => { r.deductionCents = Math.round(r.miles * irsRateCents); });
    result[Number(m)] = arr.sort((a, b) => b.miles - a.miles);
  });
  return result;
}

// ────────────────────────────────────────────────────────────────────────────
// Monthly P&L
// ────────────────────────────────────────────────────────────────────────────
export interface MonthlyPnLRow { month: string; incomeCents: number; expenseCents: number; netCents: number }

export function buildMonthlyPnL(
  invoices: Invoice[],
  expenses: Expense[],
  year: number,
): { rows: MonthlyPnLRow[]; totals: { incomeCents: number; expenseCents: number; netCents: number } } {
  const inc = new Array(12).fill(0);
  const exp = new Array(12).fill(0);
  invoices
    .filter(i => i.status === 'paid' && i.paid_at)
    .forEach(i => {
      const d = i.paid_at!;
      if (yearOf(d) !== year) return;
      inc[monthOf(d)] += Math.round(i.total_amount * 100);
    });
  expenses
    .filter(e => yearOf(e.expense_date) === year)
    .forEach(e => { exp[monthOf(e.expense_date)] += e.amount_cents; });
  const rows: MonthlyPnLRow[] = MONTH_LABELS.map((m, i) => ({
    month: m, incomeCents: inc[i], expenseCents: exp[i], netCents: inc[i] - exp[i],
  }));
  const totals = {
    incomeCents: rows.reduce((s, r) => s + r.incomeCents, 0),
    expenseCents: rows.reduce((s, r) => s + r.expenseCents, 0),
    netCents: rows.reduce((s, r) => s + r.netCents, 0),
  };
  return { rows, totals };
}

// ────────────────────────────────────────────────────────────────────────────
// Monthly Clinic Income (paid + billed per month per clinic)
// ────────────────────────────────────────────────────────────────────────────
export interface MonthlyClinicIncomeRow {
  clinic: string;
  monthlyBilledCents: number[]; // 12
  totalBilledCents: number;
  totalPaidCents: number;
  totalUnpaidCents: number;
  shiftsWorked: number;
}

export function buildMonthlyClinicIncome(
  invoices: Invoice[],
  shifts: Shift[],
  facilities: Facility[],
  year: number,
): { rows: MonthlyClinicIncomeRow[]; totals: { billedCents: number; paidCents: number; unpaidCents: number } } {
  const facMap = new Map(facilities.map(f => [f.id, f.name]));
  const rowsByFac = new Map<string, MonthlyClinicIncomeRow>();
  const ensure = (id: string) => {
    if (!rowsByFac.has(id)) {
      rowsByFac.set(id, {
        clinic: facMap.get(id) || 'Unknown',
        monthlyBilledCents: new Array(12).fill(0),
        totalBilledCents: 0, totalPaidCents: 0, totalUnpaidCents: 0, shiftsWorked: 0,
      });
    }
    return rowsByFac.get(id)!;
  };

  shifts.forEach(s => {
    const d = (s.start_datetime || '').slice(0, 10);
    if (yearOf(d) !== year) return;
    ensure(s.facility_id).shiftsWorked += 1;
  });

  invoices.forEach(inv => {
    const d = (inv.invoice_date || '').slice(0, 10);
    if (yearOf(d) !== year) return;
    const r = ensure(inv.facility_id);
    const cents = Math.round(inv.total_amount * 100);
    r.monthlyBilledCents[monthOf(d)] += cents;
    r.totalBilledCents += cents;
    if (inv.status === 'paid') r.totalPaidCents += cents;
    else r.totalUnpaidCents += Math.round((inv.balance_due ?? 0) * 100);
  });

  const rows = Array.from(rowsByFac.values())
    .filter(r => r.shiftsWorked > 0 || r.totalBilledCents > 0)
    .sort((a, b) => b.totalBilledCents - a.totalBilledCents);
  const totals = {
    billedCents: rows.reduce((s, r) => s + r.totalBilledCents, 0),
    paidCents: rows.reduce((s, r) => s + r.totalPaidCents, 0),
    unpaidCents: rows.reduce((s, r) => s + r.totalUnpaidCents, 0),
  };
  return { rows, totals };
}

// ────────────────────────────────────────────────────────────────────────────
// Monthly Expense Review by Category
// ────────────────────────────────────────────────────────────────────────────
export interface MonthlyExpenseCategoryRow {
  categoryLabel: string;
  monthlyCents: number[]; // 12
  totalCents: number;
  deductibleCents: number;
}

export function buildMonthlyExpensesByCategory(
  expenses: Expense[],
  year: number,
): { rows: MonthlyExpenseCategoryRow[]; totals: { totalCents: number; deductibleCents: number; monthly: number[] } } {
  const map = new Map<string, MonthlyExpenseCategoryRow>();
  expenses
    .filter(e => yearOf(e.expense_date) === year)
    .forEach(e => {
      const group = EXPENSE_CATEGORIES.find(g => g.subcategories.some(s => s.key === e.subcategory));
      const label = group?.label || 'Uncategorized';
      if (!map.has(label)) map.set(label, { categoryLabel: label, monthlyCents: new Array(12).fill(0), totalCents: 0, deductibleCents: 0 });
      const r = map.get(label)!;
      r.monthlyCents[monthOf(e.expense_date)] += e.amount_cents;
      r.totalCents += e.amount_cents;
      r.deductibleCents += e.deductible_amount_cents;
    });
  const rows = Array.from(map.values()).sort((a, b) => b.totalCents - a.totalCents);
  const monthly = new Array(12).fill(0);
  rows.forEach(r => r.monthlyCents.forEach((c, i) => { monthly[i] += c; }));
  return {
    rows,
    totals: {
      totalCents: rows.reduce((s, r) => s + r.totalCents, 0),
      deductibleCents: rows.reduce((s, r) => s + r.deductibleCents, 0),
      monthly,
    },
  };
}

// ────────────────────────────────────────────────────────────────────────────
// CSV
// ────────────────────────────────────────────────────────────────────────────
function csvCell(v: unknown): string {
  if (v == null) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
export function toCsv(rows: (string | number)[][]): string {
  return rows.map(r => r.map(csvCell).join(',')).join('\n');
}

export function downloadBlob(content: string, filename: string, mime = 'text/plain'): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ────────────────────────────────────────────────────────────────────────────
// CSV builders (one per section)
// ────────────────────────────────────────────────────────────────────────────
export function mileageCsv(
  monthly: MonthlyMileageRow[],
  totals: { miles: number; deductionCents: number },
  byClinic: Record<number, MonthlyMileageClinicRow[]>,
  irsRateCents: number,
  year: number,
): string {
  const rows: (string | number)[][] = [];
  rows.push([`Monthly Mileage Report — ${year}`]);
  rows.push([`IRS standard rate: ${fmtRate(irsRateCents)} per mile`]);
  rows.push([]);
  rows.push(['Month', 'Business Miles', 'IRS Rate', 'Deduction ($)']);
  monthly.forEach(r => rows.push([r.month, fmtMiles(r.miles), fmtRate(r.rateCents), fmt(r.deductionCents)]));
  rows.push(['YTD Total', fmtMiles(totals.miles), '', fmt(totals.deductionCents)]);
  rows.push([]);
  rows.push(['Clinic Detail (per month)']);
  rows.push(['Month', 'Clinic', 'Trips', 'Miles', 'Deduction ($)']);
  for (let m = 0; m < 12; m++) {
    const clinics = byClinic[m];
    if (!clinics || clinics.length === 0) continue;
    clinics.forEach(c => rows.push([MONTH_LABELS[m], c.clinic, c.trips, fmtMiles(c.miles), fmt(c.deductionCents)]));
  }
  return toCsv(rows);
}

export function pnlCsv(monthly: MonthlyPnLRow[], totals: { incomeCents: number; expenseCents: number; netCents: number }, year: number): string {
  const rows: (string | number)[][] = [];
  rows.push([`Profit & Loss — ${year}`]);
  rows.push([]);
  rows.push(['Month', 'Income', 'Expenses', 'Net']);
  monthly.forEach(r => rows.push([r.month, fmt(r.incomeCents), fmt(r.expenseCents), fmt(r.netCents)]));
  rows.push(['YTD Total', fmt(totals.incomeCents), fmt(totals.expenseCents), fmt(totals.netCents)]);
  return toCsv(rows);
}

export function clinicIncomeCsv(
  data: { rows: MonthlyClinicIncomeRow[]; totals: { billedCents: number; paidCents: number; unpaidCents: number } },
  year: number,
): string {
  const rows: (string | number)[][] = [];
  rows.push([`Income by Clinic — ${year}`]);
  rows.push([]);
  rows.push(['Clinic', 'Shifts', ...MONTH_LABELS.map(m => `${m} Billed`), 'YTD Billed', 'YTD Paid', 'YTD Unpaid']);
  data.rows.forEach(r => rows.push([
    r.clinic, r.shiftsWorked,
    ...r.monthlyBilledCents.map(fmt),
    fmt(r.totalBilledCents), fmt(r.totalPaidCents), fmt(r.totalUnpaidCents),
  ]));
  rows.push(['TOTAL', '', ...new Array(12).fill(''), fmt(data.totals.billedCents), fmt(data.totals.paidCents), fmt(data.totals.unpaidCents)]);
  return toCsv(rows);
}

export function expenseReviewCsv(
  data: { rows: MonthlyExpenseCategoryRow[]; totals: { totalCents: number; deductibleCents: number; monthly: number[] } },
  year: number,
): string {
  const rows: (string | number)[][] = [];
  rows.push([`Expense Review by Category — ${year}`]);
  rows.push([]);
  rows.push(['Category', ...MONTH_LABELS, 'YTD Total', 'YTD Deductible']);
  data.rows.forEach(r => rows.push([
    r.categoryLabel,
    ...r.monthlyCents.map(fmt),
    fmt(r.totalCents),
    fmt(r.deductibleCents),
  ]));
  rows.push(['TOTAL', ...data.totals.monthly.map(fmt), fmt(data.totals.totalCents), fmt(data.totals.deductibleCents)]);
  return toCsv(rows);
}

export function receivablesCsv(
  data: { draft: { count: number; totalCents: number }; sent: { count: number; totalCents: number }; overdue: { count: number; totalCents: number }; paid: { count: number; totalCents: number }; aging: { label: string; count: number; totalCents: number }[] },
  year: number,
): string {
  const rows: (string | number)[][] = [];
  rows.push([`Accounts Receivable — ${year}`]);
  rows.push([]);
  rows.push(['Status', 'Count', 'Amount']);
  rows.push(['Draft', data.draft.count, fmt(data.draft.totalCents)]);
  rows.push(['Sent', data.sent.count, fmt(data.sent.totalCents)]);
  rows.push(['Overdue', data.overdue.count, fmt(data.overdue.totalCents)]);
  rows.push(['Paid (YTD)', data.paid.count, fmt(data.paid.totalCents)]);
  rows.push([]);
  rows.push(['Aging Bucket', 'Count', 'Amount']);
  data.aging.forEach(b => rows.push([b.label, b.count, fmt(b.totalCents)]));
  return toCsv(rows);
}

// Exposed formatters used by PDF builder
export const _fmt = { fmt, fmtMiles, fmtRate };
