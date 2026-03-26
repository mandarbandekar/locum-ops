import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, FileText, ArrowRight, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';

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
    <Card className="h-full flex flex-col">
      <CardContent className="p-5 flex flex-col flex-1 items-center justify-center text-center">
        {/* Main figure */}
        <div className="p-3 rounded-xl bg-warning/10 mb-3">
          <DollarSign className="h-6 w-6 text-warning" />
        </div>
        <p className="text-sm text-muted-foreground font-medium mb-1">Money to collect</p>
        <p className="text-4xl font-bold tracking-tight text-foreground">
          ${totalCollectable.toLocaleString()}
        </p>

        {/* Breakdown */}
        <div className="w-full mt-5 space-y-2.5">
          {draftCount > 0 && (
            <div
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
              onClick={() => navigate('/invoices')}
            >
              <div className="p-1.5 rounded-md bg-warning/10">
                <FileText className="h-4 w-4 text-warning" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">
                  {draftCount} draft{draftCount > 1 ? 's' : ''} ready to send
                </p>
                <p className="text-xs text-muted-foreground">${draftTotal.toLocaleString()}</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          )}

          {unpaidCount > 0 && (
            <div
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
              onClick={() => navigate('/invoices')}
            >
              <div className="p-1.5 rounded-md bg-primary/10">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">
                  {unpaidCount} invoice{unpaidCount > 1 ? 's' : ''} awaiting payment
                </p>
                <p className="text-xs text-muted-foreground">${outstandingTotal.toLocaleString()}</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          )}

          {totalCollectable === 0 && (
            <div className="py-4">
              <p className="text-sm text-muted-foreground">All caught up! No money to collect.</p>
            </div>
          )}
        </div>

        {/* CTA */}
        <Button
          className="w-full mt-4"
          onClick={() => navigate('/invoices')}
        >
          Go to Invoicing
        </Button>

        {/* Paid this month */}
        <Separator className="my-4" />
        <div className="flex items-center gap-2 text-sm">
          <TrendingUp className="h-4 w-4 text-success" />
          <span className="text-muted-foreground">Collected this month:</span>
          <span className="font-bold text-success">${paidThisMonth.toLocaleString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}
