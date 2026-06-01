// PDF generation for CPA Prep section exports.
// Uses jspdf + jspdf-autotable. Each export returns a jsPDF instance; the
// caller decides whether to .save() (single section) or accumulate (full packet).

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  MONTH_LABELS,
  _fmt,
  type MonthlyMileageRow,
  type MonthlyMileageClinicRow,
  type MonthlyPnLRow,
  type MonthlyClinicIncomeRow,
  type MonthlyExpenseCategoryRow,
} from './cpaPrepExports';

const { fmt, fmtMiles, fmtRate } = _fmt;

const DISCLAIMER = 'For planning purposes only. Not tax advice. Confirm all figures with your CPA.';

function header(doc: jsPDF, title: string, subtitle?: string): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('LocumOps', 40, 48);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Generated ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}`, doc.internal.pageSize.getWidth() - 40, 48, { align: 'right' });
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(title, 40, 80);
  let y = 96;
  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(subtitle, 40, y);
    doc.setTextColor(0);
    y += 14;
  }
  return y + 8;
}

function footer(doc: jsPDF): void {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(DISCLAIMER, 40, doc.internal.pageSize.getHeight() - 24);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() - 40, doc.internal.pageSize.getHeight() - 24, { align: 'right' });
    doc.setTextColor(0);
  }
}

function lastY(doc: jsPDF): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (doc as any).lastAutoTable?.finalY ?? 100;
}

// ────────────────────────────────────────────────────────────────────────────
// Section renderers (append into an existing doc)
// ────────────────────────────────────────────────────────────────────────────

export function appendMileageSection(
  doc: jsPDF,
  year: number,
  irsRateCents: number,
  monthly: MonthlyMileageRow[],
  totals: { miles: number; deductionCents: number },
  byClinic: Record<number, MonthlyMileageClinicRow[]>,
  startingMiles?: number,
  startingMilesNote?: string,
): void {
  const startY = header(doc, `Monthly Mileage Report — ${year}`, `IRS standard rate applied: ${fmtRate(irsRateCents)} per mile`);

  autoTable(doc, {
    startY,
    head: [['Month', 'Business Miles', 'IRS Rate', 'Deduction']],
    body: monthly.map(r => [r.month, fmtMiles(r.miles), fmtRate(r.rateCents), fmt(r.deductionCents)]),
    foot: [['YTD Total', fmtMiles(totals.miles), '', fmt(totals.deductionCents)]],
    headStyles: { fillColor: [40, 40, 40] },
    footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 6 },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    margin: { left: 40, right: 40 },
  });

  if ((startingMiles ?? 0) > 0) {
    const y = lastY(doc) + 12;
    doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(110);
    doc.text(`+ Starting balance: ${fmtMiles(startingMiles!)} mi${startingMilesNote ? ` (${startingMilesNote})` : ''} — included in YTD totals shown elsewhere.`, 40, y);
    doc.setTextColor(0);
  }

  const monthsWithDetail = Object.keys(byClinic).map(Number).sort((a, b) => a - b);
  if (monthsWithDetail.length > 0) {
    let y = lastY(doc) + 28;
    if (y > doc.internal.pageSize.getHeight() - 120) { doc.addPage(); y = 60; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text('Clinic Detail by Month', 40, y);

    autoTable(doc, {
      startY: y + 10,
      head: [['Month', 'Clinic', 'Trips', 'Miles', 'Deduction']],
      body: monthsWithDetail.flatMap(m =>
        byClinic[m].map(c => [MONTH_LABELS[m], c.clinic, c.trips, fmtMiles(c.miles), fmt(c.deductionCents)])
      ),
      headStyles: { fillColor: [40, 40, 40] },
      styles: { fontSize: 9, cellPadding: 5 },
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
      margin: { left: 40, right: 40 },
    });
  }

  const y = lastY(doc) + 16;
  doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(120);
  doc.text(
    `Note: deduction = miles × current IRS rate (${fmtRate(irsRateCents)}). If the IRS rate changed mid-year, ask your CPA to recalculate.`,
    40, y, { maxWidth: doc.internal.pageSize.getWidth() - 80 },
  );
  doc.setTextColor(0);
}

export function appendPnLSection(
  doc: jsPDF,
  year: number,
  monthly: MonthlyPnLRow[],
  totals: { incomeCents: number; expenseCents: number; netCents: number },
): void {
  const startY = header(doc, `Profit & Loss — ${year}`, 'Income recognized when invoices are paid; expenses by expense date.');
  autoTable(doc, {
    startY,
    head: [['Month', 'Income', 'Expenses', 'Net']],
    body: monthly.map(r => [r.month, fmt(r.incomeCents), fmt(r.expenseCents), fmt(r.netCents)]),
    foot: [['YTD Total', fmt(totals.incomeCents), fmt(totals.expenseCents), fmt(totals.netCents)]],
    headStyles: { fillColor: [40, 40, 40] },
    footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 6 },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    margin: { left: 40, right: 40 },
  });
}

export function appendClinicIncomeSection(
  doc: jsPDF,
  year: number,
  data: { rows: MonthlyClinicIncomeRow[]; totals: { billedCents: number; paidCents: number; unpaidCents: number } },
): void {
  const startY = header(doc, `Income by Clinic — ${year}`, 'Billed amounts by month, with paid/unpaid YTD totals.');
  autoTable(doc, {
    startY,
    head: [['Clinic', 'Shifts', ...MONTH_LABELS, 'Billed', 'Paid', 'Unpaid']],
    body: data.rows.map(r => [
      r.clinic, r.shiftsWorked,
      ...r.monthlyBilledCents.map(c => c === 0 ? '—' : fmt(c)),
      fmt(r.totalBilledCents), fmt(r.totalPaidCents), fmt(r.totalUnpaidCents),
    ]),
    foot: [['TOTAL', '', ...new Array(12).fill(''), fmt(data.totals.billedCents), fmt(data.totals.paidCents), fmt(data.totals.unpaidCents)]],
    headStyles: { fillColor: [40, 40, 40], fontSize: 7 },
    footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold', fontSize: 7 },
    styles: { fontSize: 7, cellPadding: 3, overflow: 'linebreak' },
    margin: { left: 20, right: 20 },
    tableWidth: 'auto',
    horizontalPageBreak: true,
  });
}

export function appendExpenseReviewSection(
  doc: jsPDF,
  year: number,
  data: { rows: MonthlyExpenseCategoryRow[]; totals: { totalCents: number; deductibleCents: number; monthly: number[] } },
): void {
  const startY = header(doc, `Expense Review by Category — ${year}`);
  autoTable(doc, {
    startY,
    head: [['Category', ...MONTH_LABELS, 'YTD Total', 'Deductible']],
    body: data.rows.map(r => [
      r.categoryLabel,
      ...r.monthlyCents.map(c => c === 0 ? '—' : fmt(c)),
      fmt(r.totalCents),
      fmt(r.deductibleCents),
    ]),
    foot: [['TOTAL', ...data.totals.monthly.map(fmt), fmt(data.totals.totalCents), fmt(data.totals.deductibleCents)]],
    headStyles: { fillColor: [40, 40, 40], fontSize: 7 },
    footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold', fontSize: 7 },
    styles: { fontSize: 7, cellPadding: 3 },
    margin: { left: 20, right: 20 },
    horizontalPageBreak: true,
  });
}

export function appendReceivablesSection(
  doc: jsPDF,
  year: number,
  data: { draft: { count: number; totalCents: number }; sent: { count: number; totalCents: number }; overdue: { count: number; totalCents: number }; paid: { count: number; totalCents: number }; aging: { label: string; count: number; totalCents: number }[] },
): void {
  const startY = header(doc, `Accounts Receivable — ${year}`);
  autoTable(doc, {
    startY,
    head: [['Status', 'Count', 'Amount']],
    body: [
      ['Draft', data.draft.count, fmt(data.draft.totalCents)],
      ['Sent', data.sent.count, fmt(data.sent.totalCents)],
      ['Overdue', data.overdue.count, fmt(data.overdue.totalCents)],
      ['Paid (YTD)', data.paid.count, fmt(data.paid.totalCents)],
    ],
    headStyles: { fillColor: [40, 40, 40] },
    styles: { fontSize: 10, cellPadding: 6 },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    margin: { left: 40, right: 40 },
  });

  let y = lastY(doc) + 20;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text('Aging — Unpaid Invoices', 40, y);
  autoTable(doc, {
    startY: y + 8,
    head: [['Bucket', 'Count', 'Amount']],
    body: data.aging.map(b => [b.label, b.count, fmt(b.totalCents)]),
    headStyles: { fillColor: [40, 40, 40] },
    styles: { fontSize: 10, cellPadding: 6 },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    margin: { left: 40, right: 40 },
  });
}

export function appendReadinessSection(
  doc: jsPDF,
  year: number,
  items: { label: string; status: 'ok' | 'warning' | 'missing' }[],
  agenda: string[],
): void {
  const startY = header(doc, `CPA Readiness Checklist — ${year}`);
  autoTable(doc, {
    startY,
    head: [['Status', 'Item']],
    body: items.map(i => [i.status === 'ok' ? '✓' : '!', i.label]),
    headStyles: { fillColor: [40, 40, 40] },
    styles: { fontSize: 10, cellPadding: 6 },
    columnStyles: { 0: { cellWidth: 40, halign: 'center' } },
    margin: { left: 40, right: 40 },
  });

  let y = lastY(doc) + 20;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text('Discussion Agenda', 40, y);
  y += 14;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  agenda.forEach((t, i) => {
    if (y > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); y = 60; }
    const lines = doc.splitTextToSize(`${i + 1}. ${t}`, doc.internal.pageSize.getWidth() - 80);
    doc.text(lines, 40, y);
    y += lines.length * 14;
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Doc factory + finalize
// ────────────────────────────────────────────────────────────────────────────
export function newDoc(): jsPDF {
  return new jsPDF({ unit: 'pt', format: 'letter' });
}
export function finalize(doc: jsPDF): jsPDF {
  footer(doc);
  return doc;
}

// ────────────────────────────────────────────────────────────────────────────
// Full Packet (multi-page)
// ────────────────────────────────────────────────────────────────────────────
export interface FullPacketInputs {
  year: number;
  irsRateCents: number;
  mileage: { monthly: MonthlyMileageRow[]; totals: { miles: number; deductionCents: number }; byClinic: Record<number, MonthlyMileageClinicRow[]>; startingMiles?: number; startingMilesNote?: string };
  pnl: { monthly: MonthlyPnLRow[]; totals: { incomeCents: number; expenseCents: number; netCents: number } };
  clinicIncome: { rows: MonthlyClinicIncomeRow[]; totals: { billedCents: number; paidCents: number; unpaidCents: number } };
  expenseReview: { rows: MonthlyExpenseCategoryRow[]; totals: { totalCents: number; deductibleCents: number; monthly: number[] } };
  receivables: { draft: { count: number; totalCents: number }; sent: { count: number; totalCents: number }; overdue: { count: number; totalCents: number }; paid: { count: number; totalCents: number }; aging: { label: string; count: number; totalCents: number }[] };
  readiness: { items: { label: string; status: 'ok' | 'warning' | 'missing' }[]; agenda: string[] };
}

export function renderFullPacketPdf(input: FullPacketInputs): jsPDF {
  const doc = newDoc();
  // Cover
  doc.setFont('helvetica', 'bold'); doc.setFontSize(28);
  doc.text('CPA Prep Packet', 40, 140);
  doc.setFontSize(18); doc.setTextColor(100);
  doc.text(`${input.year}`, 40, 170);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(60);
  doc.text(`Generated ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}`, 40, 200);
  doc.setTextColor(0);
  doc.setFontSize(11);
  doc.text('Contents:', 40, 260);
  ['1. Profit & Loss', '2. Income by Clinic', '3. Accounts Receivable', '4. Expense Review', '5. Monthly Mileage', '6. Readiness & Agenda'].forEach((line, i) => {
    doc.text(line, 60, 282 + i * 18);
  });

  doc.addPage(); appendPnLSection(doc, input.year, input.pnl.monthly, input.pnl.totals);
  doc.addPage(); appendClinicIncomeSection(doc, input.year, input.clinicIncome);
  doc.addPage(); appendReceivablesSection(doc, input.year, input.receivables);
  doc.addPage(); appendExpenseReviewSection(doc, input.year, input.expenseReview);
  doc.addPage(); appendMileageSection(doc, input.year, input.irsRateCents, input.mileage.monthly, input.mileage.totals, input.mileage.byClinic, input.mileage.startingMiles, input.mileage.startingMilesNote);
  doc.addPage(); appendReadinessSection(doc, input.year, input.readiness.items, input.readiness.agenda);

  footer(doc);
  return doc;
}
