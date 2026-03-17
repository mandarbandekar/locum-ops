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
      <CardContent className="px-5 pb-4 space-y-0">
        {/* Paid this month */}
        <div className="flex items-center gap-3 py-3">
          <div className="p-2 rounded-lg bg-success/10">
            <DollarSign className="h-4 w-4 text-success" />
          </div>
          <div>
            <p className="text-xl font-bold leading-tight">${paidThisMonth.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Paid this month</p>
          </div>
        </div>

        <Separator className="my-1" />

        {/* Recent payments */}
        <div className="py-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recent Payments</p>
          {recentPayments.length === 0 ? (
            <p className="text-xs text-muted-foreground">No recent payments</p>
          ) : (
            <div className="space-y-1.5">
              {recentPayments.slice(0, 3).map(p => (
                <div key={p.id} className="flex items-center justify-between text-[13px]">
                  <span className="text-muted-foreground truncate">{format(new Date(p.payment_date), 'MMM d')}</span>
                  <span className="font-semibold">${p.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator className="my-1" />

        {/* Next shift */}
        <div className="py-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Next Shift</p>
          {nextShift ? (
            <div className="text-[13px]">
              <p className="font-semibold">{getFacilityName(nextShift.facility_id)}</p>
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
