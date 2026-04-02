import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, CheckCircle2 } from 'lucide-react';

interface TaxReserveStatusStripProps {
  totalIncome: number;
  estimatedTax: number;
  totalReserve: number;
}

export default function TaxReserveStatusStrip({ totalIncome, estimatedTax, totalReserve }: TaxReserveStatusStripProps) {
  const diff = totalReserve - estimatedTax;
  const isAhead = diff >= 0;
  const status = totalIncome === 0
    ? 'neutral'
    : isAhead ? 'ahead' : (Math.abs(diff) < estimatedTax * 0.1 ? 'ontrack' : 'behind');

  const messages: Record<string, { icon: React.ReactNode; text: string; className: string }> = {
    neutral: {
      icon: <CheckCircle2 className="h-5 w-5 text-muted-foreground" />,
      text: 'Start logging paid invoices to see your tax reserve estimate.',
      className: 'border-muted',
    },
    ahead: {
      icon: <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />,
      text: `You've earned $${totalIncome.toLocaleString()} this year. Based on your filing status, set aside ~$${estimatedTax.toLocaleString()}. You're ahead by $${Math.abs(diff).toLocaleString()}.`,
      className: 'border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20',
    },
    ontrack: {
      icon: <CheckCircle2 className="h-5 w-5 text-primary" />,
      text: `You've earned $${totalIncome.toLocaleString()} this year. Based on your filing status, set aside ~$${estimatedTax.toLocaleString()}. You're on track.`,
      className: 'border-primary/20 bg-primary/5',
    },
    behind: {
      icon: <TrendingDown className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
      text: `You've earned $${totalIncome.toLocaleString()} this year. Based on your filing status, set aside ~$${estimatedTax.toLocaleString()}. You're behind by $${Math.abs(diff).toLocaleString()}.`,
      className: 'border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20',
    },
  };

  const msg = messages[status];

  return (
    <Card className={`border ${msg.className}`}>
      <CardContent className="flex items-center gap-3 py-3 px-4">
        {msg.icon}
        <p className="text-sm">{msg.text}</p>
      </CardContent>
    </Card>
  );
}
