import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalIcon } from 'lucide-react';
import { formatTimeInTz, formatYMDInTz, formatDateInTz } from '@/lib/tzTime';
import { computeInvoiceStatus } from '@/lib/businessLogic';

export default function MobileSchedulePage() {
  const { facilities, shifts, invoices } = useData();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const monthLabel = cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const monthShifts = useMemo(() => {
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    return shifts
      .filter(s => {
        const d = new Date(s.start_datetime);
        return d >= start && d < end;
      })
      .sort((a, b) => a.start_datetime.localeCompare(b.start_datetime));
  }, [shifts, cursor]);

  const grouped = useMemo(() => {
    const out: Record<string, typeof monthShifts> = {};
    monthShifts.forEach(s => {
      const facility = facilities.find(f => f.id === s.facility_id);
      const tz = facility?.timezone || 'America/New_York';
      const key = formatYMDInTz(s.start_datetime, tz);
      (out[key] ||= []).push(s);
    });
    return Object.entries(out).sort(([a], [b]) => a.localeCompare(b));
  }, [monthShifts, facilities]);

  const shiftInvoiceStatus = (shiftId: string) => {
    const inv = invoices.find(i => (i as any).shift_ids?.includes?.(shiftId));
    return inv ? computeInvoiceStatus(inv) : null;
  };

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label="Previous month">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-base font-semibold">{monthLabel}</h2>
        <Button variant="ghost" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} aria-label="Next month">
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {grouped.length === 0 ? (
        <Card className="p-8 text-center">
          <CalIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No shifts this month</p>
        </Card>
      ) : (
        <div className="space-y-5">
          {grouped.map(([day, dayShifts]) => {
            const sample = dayShifts[0];
            const facility = facilities.find(f => f.id === sample.facility_id);
            const tz = facility?.timezone || 'America/New_York';
            const dayLabel = formatDateInTz(sample.start_datetime, tz, 'EEEE, MMM d');
            return (
              <div key={day}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 px-1">{dayLabel}</p>
                <div className="space-y-2">
                  {dayShifts.map(s => {
                    const f = facilities.find(x => x.id === s.facility_id);
                    const sTz = f?.timezone || 'America/New_York';
                    const invStatus = shiftInvoiceStatus(s.id);
                    return (
                      <Card key={s.id} className="p-3 active:bg-accent">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium leading-tight truncate">{f?.name || 'Clinic'}</p>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {formatTimeInTz(s.start_datetime, sTz)} – {formatTimeInTz(s.end_datetime, sTz)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              ${Number(s.rate_applied || 0).toLocaleString()} · {s.rate_kind === 'hourly' ? 'hourly' : 'day rate'}
                            </p>
                          </div>
                          {invStatus && (
                            <Badge variant={invStatus === 'paid' ? 'default' : invStatus === 'overdue' ? 'destructive' : 'secondary'} className="shrink-0 capitalize">
                              {invStatus}
                            </Badge>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Link
        to="/schedule?add=1"
        className="fixed right-4 z-30 h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}
        aria-label="Add shift"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}
