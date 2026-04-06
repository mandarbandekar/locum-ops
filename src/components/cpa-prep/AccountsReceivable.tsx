import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Receivables } from '@/hooks/useCPAPrepData';

const fmt = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;

interface Props { data: Receivables }

export default function AccountsReceivable({ data }: Props) {
  const statuses = [
    { label: 'Draft', ...data.draft, color: 'text-muted-foreground' },
    { label: 'Sent', ...data.sent, color: 'text-blue-600 dark:text-blue-400' },
    { label: 'Overdue', ...data.overdue, color: 'text-red-600 dark:text-red-400' },
    { label: 'Paid (YTD)', ...data.paid, color: 'text-green-600 dark:text-green-400' },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {statuses.map(s => (
          <div key={s.label} className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-lg font-bold ${s.color}`}>{s.count}</p>
            <p className="text-xs text-muted-foreground">{fmt(s.totalCents)}</p>
          </div>
        ))}
      </div>
      {data.aging.some(b => b.count > 0) && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Aging Buckets</p>
          <Table>
            <TableHeader><TableRow><TableHead>Period</TableHead><TableHead className="text-right">Count</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.aging.filter(b => b.count > 0).map(b => (
                <TableRow key={b.label}><TableCell>{b.label}</TableCell><TableCell className="text-right">{b.count}</TableCell><TableCell className="text-right">{fmt(b.totalCents)}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
