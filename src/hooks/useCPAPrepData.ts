import { useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { useExpenses, Expense } from '@/hooks/useExpenses';
import { useTaxAdvisor, TaxAdvisorProfile } from '@/hooks/useTaxAdvisor';
import { useTaxPaymentLogs, TaxPaymentLog } from '@/hooks/useTaxPaymentLogs';
import { EXPENSE_CATEGORIES, ALL_SUBCATEGORIES } from '@/lib/expenseCategories';
import { aggregateQuarterlyIncome } from '@/lib/taxCalculations';
import { Invoice } from '@/types';

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth(); // 0-indexed
const currentQuarter = Math.floor(currentMonth / 3) + 1;

function monthLabel(m: number) {
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m] || '';
}

// ── Snapshot ──
export interface CPASnapshot {
  ytdIncomeCents: number;
  ytdExpensesCents: number;
  ytdDeductibleCents: number;
  netIncomeCents: number;
  taxesPaidCents: number;
  projectedAnnualCents: number;
  outstandingInvoiceCents: number;
  outstandingInvoiceCount: number;
  entityType: string;
  nextPaymentDue: string | null;
}

// ── P&L ──
export interface PLRow { label: string; amountCents: number }
export interface PLMonthRow { month: string; incomeCents: number; expenseCents: number; netCents: number }
export interface PLQuarterRow { quarter: string; incomeCents: number; expenseCents: number; netCents: number }

// ── Clinic Income ──
export interface ClinicIncomeRow {
  facilityId: string; name: string; state: string;
  shiftsWorked: number; billedCents: number; paidCents: number; unpaidCents: number;
}

// ── Receivables ──
export interface AgingBucket { label: string; count: number; totalCents: number }
export interface Receivables {
  draft: { count: number; totalCents: number };
  sent: { count: number; totalCents: number };
  overdue: { count: number; totalCents: number };
  paid: { count: number; totalCents: number };
  aging: AgingBucket[];
}

// ── Expense Review ──
export interface ExpenseCategoryRow {
  categoryKey: string; categoryLabel: string; totalCents: number; deductibleCents: number;
  count: number; missingReceipts: number; largeItems: number;
}

// ── Mileage ──
export interface MileageSummary {
  totalMiles: number; deductionCents: number;
  byClinic: { name: string; miles: number }[];
}

// ── Readiness ──
export interface ReadinessItem { label: string; status: 'ok' | 'warning' | 'missing'; count?: number; link?: string }

export function useCPAPrepData() {
  const { invoices, shifts, facilities, lineItems, payments } = useData();
  const { expenses, ytdDeductibleCents, ytdTotalCents, ytdExpenses, confirmedMileageExpenses, ytdMileageMiles, ytdMileageDeductionCents, config } = useExpenses();
  const { profile } = useTaxAdvisor();
  const { payments: taxPaymentLogs } = useTaxPaymentLogs();

  // ── Snapshot ──
  const snapshot = useMemo<CPASnapshot>(() => {
    const paidInvoices = invoices.filter(i => i.status === 'paid' && i.paid_at && new Date(i.paid_at).getFullYear() === currentYear);
    const paidCents = Math.round(paidInvoices.reduce((s, i) => s + i.total_amount, 0) * 100);

    const outstanding = invoices.filter(i => (i.status === 'sent' || i.status === 'overdue' || i.status === 'partial'));
    const outstandingCents = Math.round(outstanding.reduce((s, i) => s + i.balance_due, 0) * 100);

    // Find uninvoiced YTD shifts (not linked to any line item)
    const invoicedShiftIds = new Set(lineItems.map(li => li.shift_id).filter(Boolean));
    const ytdShifts = shifts.filter(s => new Date(s.start_datetime).getFullYear() === currentYear);
    const uninvoicedRevenueCents = Math.round(
      ytdShifts
        .filter(s => !invoicedShiftIds.has(s.id))
        .reduce((sum, s) => sum + (s.rate_applied || 0), 0) * 100
    );

    const ytdIncomeCents = paidCents + outstandingCents + uninvoicedRevenueCents;

    const monthsElapsed = currentMonth + 1;
    const projectedAnnual = monthsElapsed > 0 ? Math.round((ytdIncomeCents / monthsElapsed) * 12) : 0;

    const entityType = (profile as TaxAdvisorProfile | null)?.entity_type || 'Not set';

    return {
      ytdIncomeCents,
      ytdExpensesCents: ytdTotalCents,
      ytdDeductibleCents,
      netIncomeCents: ytdIncomeCents - ytdTotalCents,
      taxesPaidCents: 0,
      projectedAnnualCents: projectedAnnual,
      outstandingInvoiceCents: outstandingCents,
      outstandingInvoiceCount: outstanding.length,
      entityType,
      nextPaymentDue: null,
    };
  }, [invoices, shifts, lineItems, ytdTotalCents, ytdDeductibleCents, profile, currentMonth]);

  // ── P&L Monthly ──
  const pnlMonthly = useMemo<PLMonthRow[]>(() => {
    const rows: PLMonthRow[] = [];
    for (let m = 0; m < 12; m++) {
      const monthInvoices = invoices.filter(i => i.status === 'paid' && i.paid_at && new Date(i.paid_at).getFullYear() === currentYear && new Date(i.paid_at).getMonth() === m);
      const inc = Math.round(monthInvoices.reduce((s, i) => s + i.total_amount, 0) * 100);
      const monthExp = ytdExpenses.filter(e => new Date(e.expense_date).getMonth() === m);
      const exp = monthExp.reduce((s, e) => s + e.amount_cents, 0);
      rows.push({ month: monthLabel(m), incomeCents: inc, expenseCents: exp, netCents: inc - exp });
    }
    return rows;
  }, [invoices, ytdExpenses]);

  const pnlQuarterly = useMemo<PLQuarterRow[]>(() => {
    const qLabels = ['Q1 (Jan–Mar)', 'Q2 (Apr–Jun)', 'Q3 (Jul–Sep)', 'Q4 (Oct–Dec)'];
    return [0,1,2,3].map(qi => {
      const months = pnlMonthly.slice(qi * 3, qi * 3 + 3);
      return {
        quarter: qLabels[qi],
        incomeCents: months.reduce((s, m) => s + m.incomeCents, 0),
        expenseCents: months.reduce((s, m) => s + m.expenseCents, 0),
        netCents: months.reduce((s, m) => s + m.netCents, 0),
      };
    });
  }, [pnlMonthly]);

  const pnlByCategory = useMemo<PLRow[]>(() => {
    const map: Record<string, number> = {};
    ytdExpenses.forEach(e => {
      const group = EXPENSE_CATEGORIES.find(g => g.subcategories.some(s => s.key === e.subcategory));
      const label = group?.label || 'Uncategorized';
      map[label] = (map[label] || 0) + e.amount_cents;
    });
    return Object.entries(map).map(([label, amountCents]) => ({ label, amountCents })).sort((a, b) => b.amountCents - a.amountCents);
  }, [ytdExpenses]);

  // ── Clinic Income ──
  const clinicIncome = useMemo<ClinicIncomeRow[]>(() => {
    const facilityMap: Record<string, ClinicIncomeRow> = {};
    facilities.forEach(f => {
      facilityMap[f.id] = { facilityId: f.id, name: f.name, state: f.address?.split(',').pop()?.trim()?.split(' ')[0] || '', shiftsWorked: 0, billedCents: 0, paidCents: 0, unpaidCents: 0 };
    });
    const ytdShifts = shifts.filter(s => new Date(s.start_datetime).getFullYear() === currentYear);
    ytdShifts.forEach(s => { if (facilityMap[s.facility_id]) facilityMap[s.facility_id].shiftsWorked++; });
    const ytdInvoices = invoices.filter(i => new Date(i.invoice_date).getFullYear() === currentYear);
    ytdInvoices.forEach(inv => {
      const row = facilityMap[inv.facility_id];
      if (!row) return;
      row.billedCents += Math.round(inv.total_amount * 100);
      if (inv.status === 'paid') row.paidCents += Math.round(inv.total_amount * 100);
      else row.unpaidCents += Math.round(inv.balance_due * 100);
    });
    return Object.values(facilityMap).filter(r => r.shiftsWorked > 0 || r.billedCents > 0).sort((a, b) => b.billedCents - a.billedCents);
  }, [facilities, shifts, invoices]);

  // ── Receivables ──
  const receivables = useMemo<Receivables>(() => {
    const now = new Date();
    const draft = invoices.filter(i => i.status === 'draft');
    const sent = invoices.filter(i => i.status === 'sent');
    const overdue = invoices.filter(i => i.status === 'overdue' || (i.status === 'sent' && i.due_date && new Date(i.due_date) < now));
    const paid = invoices.filter(i => i.status === 'paid' && i.paid_at && new Date(i.paid_at).getFullYear() === currentYear);
    const sumCents = (arr: Invoice[]) => Math.round(arr.reduce((s, i) => s + (i.balance_due ?? i.total_amount), 0) * 100);
    const sumTotalCents = (arr: Invoice[]) => Math.round(arr.reduce((s, i) => s + i.total_amount, 0) * 100);

    // Aging for unpaid
    const unpaid = invoices.filter(i => i.status !== 'draft' && i.status !== 'paid');
    const buckets: AgingBucket[] = [
      { label: '0–30 days', count: 0, totalCents: 0 },
      { label: '31–60 days', count: 0, totalCents: 0 },
      { label: '61–90 days', count: 0, totalCents: 0 },
      { label: '90+ days', count: 0, totalCents: 0 },
    ];
    unpaid.forEach(inv => {
      const dueDate = inv.due_date ? new Date(inv.due_date) : new Date(inv.invoice_date);
      const days = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / 86400000));
      const idx = days <= 30 ? 0 : days <= 60 ? 1 : days <= 90 ? 2 : 3;
      buckets[idx].count++;
      buckets[idx].totalCents += Math.round(inv.balance_due * 100);
    });

    return {
      draft: { count: draft.length, totalCents: sumTotalCents(draft) },
      sent: { count: sent.length, totalCents: sumCents(sent) },
      overdue: { count: overdue.length, totalCents: sumCents(overdue) },
      paid: { count: paid.length, totalCents: sumTotalCents(paid) },
      aging: buckets,
    };
  }, [invoices]);

  // ── Expense Review ──
  const expenseReview = useMemo<ExpenseCategoryRow[]>(() => {
    const map: Record<string, ExpenseCategoryRow> = {};
    EXPENSE_CATEGORIES.forEach(g => {
      map[g.key] = { categoryKey: g.key, categoryLabel: g.label, totalCents: 0, deductibleCents: 0, count: 0, missingReceipts: 0, largeItems: 0 };
    });
    ytdExpenses.forEach(e => {
      const group = EXPENSE_CATEGORIES.find(g => g.subcategories.some(s => s.key === e.subcategory));
      const key = group?.key || 'uncategorized';
      if (!map[key]) map[key] = { categoryKey: key, categoryLabel: 'Uncategorized', totalCents: 0, deductibleCents: 0, count: 0, missingReceipts: 0, largeItems: 0 };
      map[key].totalCents += e.amount_cents;
      map[key].deductibleCents += e.deductible_amount_cents;
      map[key].count++;
      if (e.amount_cents > 7500 && !e.receipt_url) map[key].missingReceipts++;
      if (e.amount_cents > 250000) map[key].largeItems++; // $2500+
    });
    return Object.values(map).filter(r => r.count > 0).sort((a, b) => b.totalCents - a.totalCents);
  }, [ytdExpenses]);

  // ── Mileage ──
  const mileage = useMemo<MileageSummary>(() => {
    const byClinic: Record<string, number> = {};
    confirmedMileageExpenses
      .filter(e => new Date(e.expense_date).getFullYear() === currentYear)
      .forEach(e => {
        const fac = facilities.find(f => f.id === e.facility_id);
        const name = fac?.name || 'Unknown';
        byClinic[name] = (byClinic[name] || 0) + (e.mileage_miles || 0);
      });
    return {
      totalMiles: ytdMileageMiles,
      deductionCents: ytdMileageDeductionCents,
      byClinic: Object.entries(byClinic).map(([name, miles]) => ({ name, miles })).sort((a, b) => b.miles - a.miles),
    };
  }, [confirmedMileageExpenses, facilities, ytdMileageMiles, ytdMileageDeductionCents]);

  // ── Readiness ──
  const readiness = useMemo<ReadinessItem[]>(() => {
    const items: ReadinessItem[] = [];
    const uncategorized = ytdExpenses.filter(e => !e.subcategory || e.subcategory === 'other');
    items.push(uncategorized.length > 0
      ? { label: `${uncategorized.length} expenses need categorization`, status: 'warning', count: uncategorized.length, link: '/expenses' }
      : { label: 'All expenses categorized', status: 'ok' });

    const missingReceipts = ytdExpenses.filter(e => e.amount_cents > 7500 && !e.receipt_url);
    items.push(missingReceipts.length > 0
      ? { label: `${missingReceipts.length} expenses over $75 missing receipts`, status: 'warning', count: missingReceipts.length, link: '/expenses' }
      : { label: 'Receipts complete for expenses over $75', status: 'ok' });

    const unpaidCount = invoices.filter(i => i.status === 'sent' || i.status === 'overdue' || i.status === 'partial').length;
    items.push(unpaidCount > 0
      ? { label: `${unpaidCount} unpaid invoices to review`, status: 'warning', count: unpaidCount, link: '/invoices' }
      : { label: 'All invoices settled', status: 'ok' });

    const entitySet = profile?.entity_type && profile.entity_type !== 'not_set';
    items.push(entitySet
      ? { label: 'Entity type configured', status: 'ok' }
      : { label: 'Entity type not set — update your profile', status: 'missing', link: '/business?tab=cpa-prep' });

    const hasMileage = ytdMileageMiles > 0;
    const hasShifts = shifts.filter(s => new Date(s.start_datetime).getFullYear() === currentYear).length > 0;
    if (hasShifts && !hasMileage) {
      items.push({ label: 'No mileage tracked — consider logging commute miles', status: 'warning', link: '/expenses' });
    } else if (hasMileage) {
      items.push({ label: `${Math.round(ytdMileageMiles)} business miles logged`, status: 'ok' });
    }

    const largeItems = ytdExpenses.filter(e => e.amount_cents > 250000);
    if (largeItems.length > 0) {
      items.push({ label: `${largeItems.length} purchases over $2,500 — review depreciation with CPA`, status: 'warning', count: largeItems.length });
    }

    return items;
  }, [ytdExpenses, invoices, profile, ytdMileageMiles, shifts]);

  // ── Discussion Agenda ──
  const agenda = useMemo<string[]>(() => {
    const topics: string[] = [];
    if (snapshot.ytdIncomeCents > 8000000) topics.push('Review S-Corp election timing and potential tax savings');
    const states = new Set(facilities.map(f => f.address?.split(',').pop()?.trim()?.split(' ')[0]).filter(Boolean));
    if (states.size > 1) topics.push('Discuss multi-state filing obligations');
    const hasRetirement = ytdExpenses.some(e => e.category === 'retirement' || e.subcategory === 'sep_ira' || e.subcategory === 'solo_401k');
    if (!hasRetirement) topics.push('Review retirement contribution options (SEP-IRA, Solo 401k)');
    if (snapshot.outstandingInvoiceCount > 3) topics.push('Review accounts receivable and cash flow timing');
    const largeItems = ytdExpenses.filter(e => e.amount_cents > 250000);
    if (largeItems.length > 0) topics.push('Review depreciation strategy for large equipment purchases');
    if (snapshot.ytdIncomeCents > 5000000) topics.push('Confirm quarterly estimated tax payment amounts');
    if (ytdMileageMiles > 500) topics.push('Confirm mileage deduction method (standard vs. actual)');
    const hasHealthIns = ytdExpenses.some(e => e.subcategory === 'health_insurance');
    if (!hasHealthIns && snapshot.ytdIncomeCents > 3000000) topics.push('Discuss self-employed health insurance deduction');
    if (topics.length === 0) topics.push('Review overall tax position and planning opportunities');
    return topics;
  }, [snapshot, facilities, ytdExpenses, ytdMileageMiles]);

  return {
    snapshot,
    pnlMonthly,
    pnlQuarterly,
    pnlByCategory,
    clinicIncome,
    receivables,
    expenseReview,
    mileage,
    readiness,
    agenda,
    profile,
    taxPaymentLogs,
  };
}
