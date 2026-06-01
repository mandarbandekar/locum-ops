import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { buildMonthlyMileageRows, buildMileageTripLog } from '@/lib/cpaPrepExports';
import type { Expense } from '@/hooks/useExpenses';
import type { Facility } from '@/types';

interface Props {
  expenses: Expense[];
  facilities: Facility[];
  year: number;
  irsRateCents: number;
}

const fmtMiles = (n: number) => Math.round(n).toLocaleString('en-US');
const fmt = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function MonthlyMileagePreview({ expenses, facilities, year, irsRateCents }: Props) {
  const [open, setOpen] = useState(false);
  const [openMonths, setOpenMonths] = useState<Record<number, boolean>>({});

  const { rows, totals } = useMemo(
    () => buildMonthlyMileageRows(expenses, year, irsRateCents),
    [expenses, year, irsRateCents],
  );
  const tripLog = useMemo(
    () => buildMileageTripLog(expenses, facilities, year, irsRateCents),
    [expenses, facilities, year, irsRateCents],
  );
  const tripsByMonth = useMemo(() => {
    const m = new Map<number, number>();
    tripLog.forEach(l => m.set(l.monthIndex, l.trips.length));
    return m;
  }, [tripLog]);

  if (totals.miles === 0) return null;

  return (
    <div className="mt-4 border-t border-border/40 pt-3">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        Monthly breakdown (IRS rate: ${(irsRateCents / 100).toFixed(2)}/mi)
      </button>
      {open && (
        <div className="mt-3 space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/40 text-muted-foreground">
                  <th className="text-left font-medium py-1.5">Month</th>
                  <th className="text-right font-medium py-1.5">Trips</th>
                  <th className="text-right font-medium py-1.5">Miles</th>
                  <th className="text-right font-medium py-1.5">Deduction</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const trips = tripsByMonth.get(i) ?? 0;
                  const dim = r.miles === 0;
                  return (
                    <tr key={r.month} className={`${dim ? 'text-muted-foreground/60' : ''} ${i < rows.length - 1 ? 'border-b border-border/20' : ''}`}>
                      <td className="py-1.5">{r.month}</td>
                      <td className="text-right py-1.5 tabular-nums">{trips || '—'}</td>
                      <td className="text-right py-1.5 tabular-nums">{dim ? '—' : fmtMiles(r.miles)}</td>
                      <td className="text-right py-1.5 tabular-nums">{dim ? '—' : fmt(r.deductionCents)}</td>
                    </tr>
                  );
                })}
                <tr className="border-t border-border/60 font-semibold">
                  <td className="py-1.5">YTD</td>
                  <td className="text-right py-1.5 tabular-nums">{tripLog.reduce((s, l) => s + l.trips.length, 0)}</td>
                  <td className="text-right py-1.5 tabular-nums">{fmtMiles(totals.miles)}</td>
                  <td className="text-right py-1.5 tabular-nums">{fmt(totals.deductionCents)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {tripLog.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Trip log</p>
              <div className="space-y-1.5">
                {tripLog.map(month => {
                  const isOpen = !!openMonths[month.monthIndex];
                  return (
                    <div key={month.monthIndex} className="rounded-md border border-border/40">
                      <button
                        type="button"
                        onClick={() => setOpenMonths(m => ({ ...m, [month.monthIndex]: !isOpen }))}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs hover:bg-muted/40 transition-colors"
                      >
                        <span className="flex items-center gap-1.5 font-medium">
                          {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          {month.monthLabel}
                          <span className="text-muted-foreground font-normal">· {month.trips.length} {month.trips.length === 1 ? 'trip' : 'trips'}</span>
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          {fmtMiles(month.subtotalMiles)} mi · <span className="font-medium text-foreground">{fmt(month.subtotalAmountCents)}</span>
                        </span>
                      </button>
                      {isOpen && (
                        <div className="border-t border-border/40 px-2.5 py-2">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-muted-foreground">
                                <th className="text-left font-medium pb-1.5 w-24">Date</th>
                                <th className="text-left font-medium pb-1.5">Place</th>
                                <th className="text-right font-medium pb-1.5 w-16">Miles</th>
                                <th className="text-right font-medium pb-1.5 w-20">$</th>
                              </tr>
                            </thead>
                            <tbody>
                              {month.trips.map((t, idx) => (
                                <tr key={idx} className="border-t border-border/20 align-top">
                                  <td className="py-1.5 tabular-nums">{t.date}</td>
                                  <td className="py-1.5">
                                    <div className="font-medium">{t.place}</div>
                                    {t.address && <div className="text-muted-foreground text-[11px]">{t.address}</div>}
                                  </td>
                                  <td className="py-1.5 text-right tabular-nums">{fmtMiles(t.miles)}</td>
                                  <td className="py-1.5 text-right tabular-nums">{fmt(t.amountCents)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
