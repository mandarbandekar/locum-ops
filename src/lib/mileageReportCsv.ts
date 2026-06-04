import type { Expense } from '@/hooks/useExpenses';
import type { Facility } from '@/types';
import { toCsv } from '@/lib/cpaPrepExports';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const fmt = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtMiles = (n: number) => (Math.round(n * 10) / 10).toLocaleString('en-US');
const fmtRate = (cents: number) => `$${(cents / 100).toFixed(3)}`;

/**
 * jsPDF default Helvetica uses WinAnsi (CP1252) encoding which cannot render
 * characters like → (U+2192). When that happens, glyphs render with broken
 * letter-spacing. Sanitize text before sending it to the PDF.
 */
function pdfSafe(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/[\u2192\u2794\u27A1\u279C\u279D\u279E\u27F6\u2B95]/g, '>') // arrows
    .replace(/[\u2190\u2B05]/g, '<')                                      // left arrows
    .replace(/[\u2194\u2B0C]/g, '<>')                                     // double arrows
    .replace(/\u00A0/g, ' ')                                              // nbsp
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A1-\u00FF\u20AC\u2013\u2014\u2018-\u201D\u2022\u2026]/g, '?');
}


export interface MileageFilter {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD inclusive
  clinicIds: string[] | null; // null = all
  status: 'all' | 'confirmed' | 'draft';
}

export interface FilteredTrip {
  date: string;
  clinic: string;
  address: string;
  description: string;
  miles: number;
  deductionCents: number;
  status: string;
}

export function filterMileageTrips(
  expenses: Expense[],
  facilities: Facility[],
  filter: MileageFilter,
  irsRateCents: number,
): FilteredTrip[] {
  const facMap = new Map(facilities.map(f => [f.id, f]));
  return expenses
    .filter(e => (e.mileage_miles || 0) > 0)
    .filter(e => e.expense_date >= filter.start && e.expense_date <= filter.end)
    .filter(e => {
      if (filter.status === 'all') return true;
      const st = (e as any).mileage_status || 'confirmed';
      return st === filter.status;
    })
    .filter(e => !filter.clinicIds || (e.facility_id && filter.clinicIds.includes(e.facility_id)))
    .map(e => {
      const fac = e.facility_id ? facMap.get(e.facility_id) : undefined;
      const miles = e.mileage_miles || 0;
      return {
        date: e.expense_date,
        clinic: fac?.name || 'Unlinked',
        address: fac?.address || '',
        description: e.route_description || e.description || '',
        miles,
        deductionCents: Math.round(miles * irsRateCents),
        status: (e as any).mileage_status || 'confirmed',
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function buildFilteredMileageCsv(
  trips: FilteredTrip[],
  rangeLabel: string,
  irsRateCents: number,
): string {
  const totalMiles = trips.reduce((s, t) => s + t.miles, 0);
  const totalDeduction = trips.reduce((s, t) => s + t.deductionCents, 0);
  const rows: (string | number)[][] = [];
  rows.push([`Mileage Report — ${rangeLabel}`]);
  rows.push([`IRS standard rate: ${fmtRate(irsRateCents)} per mile`]);
  rows.push([]);
  rows.push(['Summary']);
  rows.push(['Trips', trips.length]);
  rows.push(['Total miles', fmtMiles(totalMiles)]);
  rows.push(['Total deduction', fmt(totalDeduction)]);
  rows.push([]);
  rows.push(['Date', 'Clinic', 'Address', 'Route / Description', 'Miles', 'Deduction', 'Status']);
  trips.forEach(t => rows.push([
    t.date, t.clinic, t.address, t.description, fmtMiles(t.miles), fmt(t.deductionCents), t.status,
  ]));
  return toCsv(rows);
}

export interface YtdContext {
  miles: number;
  deductionCents: number;
  year: number;
}

export function buildFilteredMileagePdf(
  trips: FilteredTrip[],
  rangeLabel: string,
  irsRateCents: number,
  ytd?: YtdContext,
): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 40;
  const contentW = pageW - marginX * 2;
  const totalMiles = trips.reduce((s, t) => s + t.miles, 0);
  const totalDeduction = trips.reduce((s, t) => s + t.deductionCents, 0);

  // ───────── Header band ─────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(26, 92, 107); // brand teal
  doc.text('LocumOps', marginX, 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(
    `Generated ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}`,
    pageW - marginX,
    50,
    { align: 'right' }
  );
  // Hairline under header
  doc.setDrawColor(220);
  doc.setLineWidth(0.5);
  doc.line(marginX, 60, pageW - marginX, 60);

  // ───────── Title ─────────
  doc.setTextColor(20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(pdfSafe(`Mileage Report — ${rangeLabel}`), marginX, 88);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(
    `IRS standard rate applied: ${fmtRate(irsRateCents)} per mile`,
    marginX,
    104
  );
  doc.setTextColor(20);

  // ───────── Period summary (3 boxes) ─────────
  autoTable(doc, {
    startY: 120,
    head: [['Trips', 'Total miles', 'Total deduction']],
    body: [[
      String(trips.length),
      fmtMiles(totalMiles),
      fmt(totalDeduction),
    ]],
    theme: 'grid',
    tableWidth: contentW,
    headStyles: {
      fillColor: [243, 244, 246],
      textColor: 60,
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left',
    },
    bodyStyles: { fontSize: 12, fontStyle: 'bold', cellPadding: 8, textColor: 20 },
    columnStyles: {
      0: { cellWidth: contentW / 3 },
      1: { cellWidth: contentW / 3 },
      2: { cellWidth: contentW / 3 },
    },
    margin: { left: marginX, right: marginX },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cursorY = (doc as any).lastAutoTable?.finalY ?? 160;

  // ───────── YTD context strip ─────────
  if (ytd) {
    cursorY += 14;
    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(marginX, cursorY, contentW, 38, 4, 4, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text(`${ytd.year} YEAR-TO-DATE`, marginX + 12, cursorY + 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(20);
    doc.text(
      `${fmtMiles(ytd.miles)} miles tracked`,
      marginX + 12,
      cursorY + 30
    );
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 92, 107);
    doc.text(
      `${fmt(ytd.deductionCents)} deduction`,
      pageW - marginX - 12,
      cursorY + 30,
      { align: 'right' }
    );
    doc.setTextColor(20);
    cursorY += 38;
  }

  // ───────── Trips detail ─────────
  cursorY += 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(20);
  doc.text('Trip detail', marginX, cursorY);
  cursorY += 6;

  if (trips.length === 0) {
    cursorY += 24;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(140);
    doc.text('No drives in this range.', marginX, cursorY);
  } else {
    // Column widths sum to contentW (~ 532pt for letter / 40pt margins)
    const colDate = 64;
    const colMiles = 48;
    const colDeduction = 72;
    const colStatus = 60;
    const remaining = contentW - colDate - colMiles - colDeduction - colStatus;
    const colClinic = Math.round(remaining * 0.42);
    const colRoute = remaining - colClinic;

    autoTable(doc, {
      startY: cursorY + 4,
      head: [['Date', 'Clinic', 'Route', 'Miles', 'Deduction', 'Status']],
      body: trips.map(t => [
        t.date,
        pdfSafe(t.clinic),
        pdfSafe(t.description) || '—',
        fmtMiles(t.miles),
        fmt(t.deductionCents),
        t.status.charAt(0).toUpperCase() + t.status.slice(1),
      ]),
      foot: [[
        'Totals',
        '',
        '',
        fmtMiles(totalMiles),
        fmt(totalDeduction),
        '',
      ]],
      theme: 'striped',
      tableWidth: contentW,
      headStyles: {
        fillColor: [33, 37, 41],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 6,
        textColor: 30,
        overflow: 'linebreak',
        valign: 'middle',
      },
      footStyles: {
        fillColor: [243, 244, 246],
        textColor: 20,
        fontStyle: 'bold',
        fontSize: 9,
      },
      alternateRowStyles: { fillColor: [250, 250, 252] },
      columnStyles: {
        0: { cellWidth: colDate },
        1: { cellWidth: colClinic },
        2: { cellWidth: colRoute },
        3: { cellWidth: colMiles, halign: 'right' },
        4: { cellWidth: colDeduction, halign: 'right' },
        5: { cellWidth: colStatus },
      },
      margin: { left: marginX, right: marginX, bottom: 50 },
    });
  }

  // ───────── Footer (on every page) ─────────
  const disclaimer = 'For planning purposes only. Not tax advice. Confirm all figures with your CPA.';
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.5);
    doc.line(marginX, pageH - 36, pageW - marginX, pageH - 36);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(disclaimer, marginX, pageH - 22);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageW - marginX,
      pageH - 22,
      { align: 'right' }
    );
    doc.setTextColor(0);
  }

  return doc;
}

