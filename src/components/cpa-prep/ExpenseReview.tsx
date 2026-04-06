import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import type { ExpenseCategoryRow } from '@/hooks/useCPAPrepData';

const fmt = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;

interface Props { rows: ExpenseCategoryRow[] }

export default function ExpenseReview({ rows }: Props) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground py-4 text-center">No expenses recorded yet. Start tracking expenses to see your tax deduction summary.</p>;
  const totalMissing = rows.reduce((s, r) => s + r.missingReceipts, 0);
  const totalLarge = rows.reduce((s, r) => s + r.largeItems, 0);

  return (
    <div className="space-y-3">
      {(totalMissing > 0 || totalLarge > 0) && (
        <div className="flex flex-wrap gap-2">
          {totalMissing > 0 && <Badge variant="outline" className="text-orange-600 border-orange-300"><AlertTriangle className="h-3 w-3 mr-1" />{totalMissing} missing receipt{totalMissing > 1 ? 's' : ''} (over $75)</Badge>}
          {totalLarge > 0 && <Badge variant="outline" className="text-purple-600 border-purple-300"><AlertTriangle className="h-3 w-3 mr-1" />{totalLarge} large purchase{totalLarge > 1 ? 's' : ''} (over $2,500)</Badge>}
        </div>
      )}
      <Table>
        <TableHeader><TableRow><TableHead>Category</TableHead><TableHead className="text-right">Items</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Deductible</TableHead><TableHead className="text-right">Flags</TableHead></TableRow></TableHeader>
        <TableBody>
          {rows.map(r => (
            <TableRow key={r.categoryKey}>
              <TableCell className="font-medium">{r.categoryLabel}</TableCell>
              <TableCell className="text-right">{r.count}</TableCell>
              <TableCell className="text-right">{fmt(r.totalCents)}</TableCell>
              <TableCell className="text-right text-green-600 dark:text-green-400">{fmt(r.deductibleCents)}</TableCell>
              <TableCell className="text-right">
                {r.missingReceipts > 0 && <span className="text-orange-500 text-xs mr-1">🧾{r.missingReceipts}</span>}
                {r.largeItems > 0 && <span className="text-purple-500 text-xs">💰{r.largeItems}</span>}
                {r.missingReceipts === 0 && r.largeItems === 0 && <span className="text-green-500 text-xs">✓</span>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
