import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { formatDateInTz, formatTimeInTz } from '@/lib/tzTime';
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

// Parse YYYY-MM-DD as local date to avoid UTC off-by-one
function parseLocalYMD(d: string): Date {
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  return new Date(d);
}

export function ThisWeekCard({ paidThisMonth, recentPayments, nextShift, getFacilityName }: ThisWeekCardProps) {
  const { facilities } = useData();
  const tzFor = (fid: string) => facilities.find((f: any) => f.id === fid)?.timezone || 'America/Los_Angeles';
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
              {recentPayments.slice(0, 3).map(p => {
                const d = parseLocalYMD(p.payment_date);
                return (
                  <div key={p.id} className="flex items-center justify-between text-[13px]">
                    <span className="text-muted-foreground truncate">{d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    <span className="font-semibold">${p.amount.toLocaleString()}</span>
                  </div>
                );
              })}
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
                {formatDateInTz(nextShift.start_datetime, tzFor(nextShift.facility_id), 'EEE, MMM d')} · {formatTimeInTz(nextShift.start_datetime, tzFor(nextShift.facility_id))}
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
