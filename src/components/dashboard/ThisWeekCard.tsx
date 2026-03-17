import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  invoice_id: string;
}

interface ShiftPreview {
  id: string;
  start_datetime: string;
  facility_id: string;
}

interface ThisWeekCardProps {
  paidThisMonth: number;
  recentPayments: Payment[];
  nextShift: ShiftPreview | null;
  getFacilityName: (id: string) => string;
}

export function ThisWeekCard({ paidThisMonth, recentPayments, nextShift, getFacilityName }: ThisWeekCardProps) {
  return (
    <Card className="h-fit" data-testid="this-week-card">
      <CardHeader className="pb-1.5 pt-4 px-5">
        <CardTitle className="text-base font-bold tracking-tight">This Week</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-0">
        {/* Paid this month */}
        <div className="flex items-center gap-2 py-2">
          <div className="p-1.5 rounded-md bg-emerald-500/10">
            <DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-lg font-bold leading-tight">${paidThisMonth.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground">Paid this month</p>
          </div>
        </div>

        <Separator className="my-1" />

        {/* Recent payments */}
        <div className="py-2">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Recent Payments</p>
          {recentPayments.length === 0 ? (
            <p className="text-xs text-muted-foreground">No recent payments</p>
          ) : (
            <div className="space-y-1">
              {recentPayments.slice(0, 3).map(p => (
                <div key={p.id} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground truncate">{format(new Date(p.payment_date), 'MMM d')}</span>
                  <span className="font-medium">${p.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator className="my-1" />

        {/* Next shift */}
        <div className="py-2">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Next Shift</p>
          {nextShift ? (
            <div className="text-xs">
              <p className="font-medium">{getFacilityName(nextShift.facility_id)}</p>
              <p className="text-muted-foreground">
                {format(new Date(nextShift.start_datetime), 'EEE, MMM d · h:mm a')}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No upcoming shifts</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
