import type { Expense } from '@/hooks/useExpenses';
import type { Facility } from '@/types';
import { toCsv } from '@/lib/cpaPrepExports';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const fmt = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtMiles = (n: number) => (Math.round(n * 10) / 10).toLocaleString('en-US');
const fmtRate = (cents: number) => `$${(cents / 100).toFixed(3)}`;

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
