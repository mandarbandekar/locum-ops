import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, FileText, ArrowRight, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MoneyToCollectCardProps {
  outstandingTotal: number;
  unpaidCount: number;
  draftTotal: number;
  draftCount: number;
  paidThisMonth: number;
}

export function MoneyToCollectCard({
  outstandingTotal,
  unpaidCount,
  draftTotal,
  draftCount,
  paidThisMonth,
}: MoneyToCollectCardProps) {
  const navigate = useNavigate();
  const totalCollectable = outstandingTotal + draftTotal;

  return (
    <Card className="h-full flex flex-col border-0 shadow-md">
      <CardContent className="p-0 flex flex-col flex-1">
        {/* Hero amount */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 pt-8 pb-6">
          <div className="p-3.5 rounded-2xl bg-warning/10 mb-4">
            <DollarSign className="h-7 w-7 text-warning" />
          </div>
          <p className="text-[13px] text-muted-foreground font-medium mb-1 tracking-wide">Money to collect</p>
          <p className="text-[42px] font-extrabold tracking-tight text-foreground leading-none">
            ${totalCollectable.toLocaleString()}
          </p>
        </div>

        {/* Breakdown items */}
        <div className="px-5 space-y-2">
          {draftCount > 0 && (
            <div
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 cursor-pointer hover:bg-muted/70 transition-colors"
              onClick={() => navigate('/invoices')}
            >
              <div className="p-2 rounded-lg bg-warning/10">
                <FileText className="h-4 w-4 text-warning" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold">
                  {draftCount} shift{draftCount > 1 ? 's' : ''} ready to invoice
                </p>
                <p className="text-[11px] text-muted-foreground">${draftTotal.toLocaleString()}</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            </div>
          )}

          {unpaidCount > 0 && (
            <div
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 cursor-pointer hover:bg-muted/70 transition-colors"
              onClick={() => navigate('/invoices')}
            >
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold">
                  {unpaidCount} invoice{unpaidCount > 1 ? 's' : ''} awaiting payment
                </p>
                <p className="text-[11px] text-muted-foreground">${outstandingTotal.toLocaleString()}</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            </div>
          )}

          {totalCollectable === 0 && (
            <div className="py-4 text-center">
              <p className="text-sm text-muted-foreground">All caught up! No money to collect.</p>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="px-5 pt-4">
          <Button className="w-full h-11 font-semibold text-[13px]" onClick={() => navigate('/invoices')}>
            Go to Invoicing
          </Button>
        </div>

        {/* Collected footer */}
        <div className="px-5 py-4 mt-auto">
          <div className="flex items-center justify-center gap-2 text-[13px]">
            <TrendingUp className="h-4 w-4 text-success" />
            <span className="text-muted-foreground">Collected this month:</span>
            <span className="font-bold text-success">${paidThisMonth.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
