import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { buildMonthlyMileageRows, MONTH_LABELS } from '@/lib/cpaPrepExports';
import type { Expense } from '@/hooks/useExpenses';

interface Props {
  expenses: Expense[];
  year: number;
  irsRateCents: number;
}

const fmtMiles = (n: number) => Math.round(n).toLocaleString('en-US');
const fmt = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function MonthlyMileagePreview({ expenses, year, irsRateCents }: Props) {
  const [open, setOpen] = useState(false);
  const { rows, totals } = useMemo(
    () => buildMonthlyMileageRows(expenses, year, irsRateCents),
    [expenses, year, irsRateCents],
  );

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
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/40 text-muted-foreground">
                <th className="text-left font-medium py-1.5">Month</th>
                <th className="text-right font-medium py-1.5">Miles</th>
                <th className="text-right font-medium py-1.5">Deduction</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.month} className={`${r.miles === 0 ? 'text-muted-foreground/60' : ''} ${i < rows.length - 1 ? 'border-b border-border/20' : ''}`}>
                  <td className="py-1.5">{r.month}</td>
                  <td className="text-right py-1.5 tabular-nums">{r.miles === 0 ? '—' : fmtMiles(r.miles)}</td>
                  <td className="text-right py-1.5 tabular-nums">{r.deductionCents === 0 ? '—' : fmt(r.deductionCents)}</td>
                </tr>
              ))}
              <tr className="border-t border-border/60 font-semibold">
                <td className="py-1.5">YTD</td>
                <td className="text-right py-1.5 tabular-nums">{fmtMiles(totals.miles)}</td>
                <td className="text-right py-1.5 tabular-nums">{fmt(totals.deductionCents)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
