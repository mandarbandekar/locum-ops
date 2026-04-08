import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Receipt, Wallet, Building2 } from 'lucide-react';
import type { TaxPaymentLog } from '@/hooks/useTaxPaymentLogs';

interface Props {
  payments: TaxPaymentLog[];
}

const TYPE_LABELS: Record<string, string> = {
  federal_1040es: 'Federal',
  state_personal: 'State',
  state_pte: 'PTE',
  payroll_fica: 'Payroll',
};

function fmt(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export default function TaxPaymentHistory({ payments }: Props) {
  if (payments.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Receipt className="h-4 w-4 text-primary" />
          Payment History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quarter</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Date Paid</TableHead>
              <TableHead>Account</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.quarter} {p.tax_year}</TableCell>
                <TableCell>{TYPE_LABELS[p.payment_type] || p.payment_type}{p.state_key ? ` (${p.state_key})` : ''}</TableCell>
                <TableCell className="text-right font-medium">${fmt(p.amount)}</TableCell>
                <TableCell className="text-muted-foreground">{p.date_paid}</TableCell>
                <TableCell>
                  {p.paid_from === 'business' ? (
                    <Badge variant="info" className="gap-1 text-[10px]">
                      <Building2 className="h-3 w-3" /> business
                    </Badge>
                  ) : (
                    <Badge variant="success" className="gap-1 text-[10px]">
                      <Wallet className="h-3 w-3" /> personal
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
