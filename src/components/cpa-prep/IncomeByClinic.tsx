import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ClinicIncomeRow } from '@/hooks/useCPAPrepData';

const fmt = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;

interface Props { rows: ClinicIncomeRow[] }

export default function IncomeByClinic({ rows }: Props) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground py-4 text-center">No clinic income data yet. Start logging shifts and invoices to see a breakdown.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Clinic</TableHead>
          <TableHead className="text-right">Shifts</TableHead>
          <TableHead className="text-right">Billed</TableHead>
          <TableHead className="text-right">Paid</TableHead>
          <TableHead className="text-right">Unpaid</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(r => (
          <TableRow key={r.facilityId}>
            <TableCell><span className="font-medium">{r.name}</span>{r.state && <span className="text-muted-foreground text-xs ml-1">({r.state})</span>}</TableCell>
            <TableCell className="text-right">{r.shiftsWorked}</TableCell>
            <TableCell className="text-right">{fmt(r.billedCents)}</TableCell>
            <TableCell className="text-right text-green-600 dark:text-green-400">{fmt(r.paidCents)}</TableCell>
            <TableCell className="text-right text-orange-600 dark:text-orange-400">{fmt(r.unpaidCents)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
