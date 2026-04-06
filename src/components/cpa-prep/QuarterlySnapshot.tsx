import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, TrendingUp, Receipt, FileText, Building2 } from 'lucide-react';
import type { CPASnapshot } from '@/hooks/useCPAPrepData';

const fmt = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

interface Props { snapshot: CPASnapshot }

export default function QuarterlySnapshot({ snapshot }: Props) {
  const cards = [
    { label: 'YTD Gross Income', value: fmt(snapshot.ytdIncomeCents), icon: DollarSign, color: 'text-green-600 dark:text-green-400', desc: "You've earned this year" },
    { label: 'YTD Deductible Expenses', value: fmt(snapshot.ytdDeductibleCents), icon: Receipt, color: 'text-blue-600 dark:text-blue-400', desc: 'in deductible expenses recorded' },
    { label: 'Estimated Net Income', value: fmt(snapshot.netIncomeCents), icon: TrendingUp, color: snapshot.netIncomeCents >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400', desc: 'income minus expenses' },
    { label: 'Outstanding Invoices', value: `${snapshot.outstandingInvoiceCount} (${fmt(snapshot.outstandingInvoiceCents)})`, icon: FileText, color: 'text-orange-600 dark:text-orange-400', desc: 'awaiting payment' },
    { label: 'Projected Annual Income', value: fmt(snapshot.projectedAnnualCents), icon: TrendingUp, color: 'text-purple-600 dark:text-purple-400', desc: 'based on YTD pace' },
    { label: 'Entity Type', value: snapshot.entityType === 'not_set' ? 'Not set' : snapshot.entityType.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()), icon: Building2, color: 'text-muted-foreground', desc: 'business structure' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {cards.map(c => (
        <Card key={c.label} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <c.icon className={`h-4 w-4 ${c.color}`} />
              <span className="text-xs text-muted-foreground font-medium">{c.label}</span>
            </div>
            <p className={`text-lg font-bold ${c.color}`}>{c.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{c.desc}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
