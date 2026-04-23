import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BarChart3, Building2, TrendingUp } from 'lucide-react';
import type { Facility, Invoice, Shift } from '@/types';

interface Props {
  facilities: Facility[];
  invoices: Invoice[];
  shifts: Shift[];
  sessionShiftIds: string[];
}

export function OnboardingFinancialReveal({ facilities, invoices, shifts, sessionShiftIds }: Props) {
  const sessionShifts = useMemo(
    () => shifts.filter(s => sessionShiftIds.includes(s.id)),
    [shifts, sessionShiftIds],
  );

  const earned = sessionShifts.reduce((sum, s) => sum + (s.rate_applied || 0), 0);

  const usedFacilityIds = new Set(sessionShifts.map(s => s.facility_id));
  const sessionDrafts = invoices.filter(
    i => usedFacilityIds.has(i.facility_id) && i.status === 'draft',
  );
  const outstanding = sessionDrafts.reduce((sum, i) => sum + (i.balance_due || 0), 0);

  const totalHours = sessionShifts.reduce((sum, s) => {
    const start = new Date(s.start_datetime).getTime();
    const end = new Date(s.end_datetime).getTime();
    return sum + Math.max(0, (end - start) / 3600000);
  }, 0);
  const avgPerShift = sessionShifts.length > 0 ? earned / sessionShifts.length : 0;

  // Income by clinic
  const byClinic = useMemo(() => {
    const map = new Map<string, number>();
    sessionShifts.forEach(s => {
      map.set(s.facility_id, (map.get(s.facility_id) || 0) + (s.rate_applied || 0));
    });
    const max = Math.max(...Array.from(map.values()), 1);
    return Array.from(map.entries())
      .map(([fid, amt]) => ({
        facility: facilities.find(f => f.id === fid),
        amount: amt,
        percent: (amt / max) * 100,
      }))
      .filter(r => r.facility);
  }, [sessionShifts, facilities]);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold text-foreground font-[Manrope]">
            Your Financial Health is live
          </h2>
        </div>
        <p className="text-muted-foreground">
          Every shift you log and every invoice that gets paid keeps this updated automatically.
        </p>
      </div>

      {/* This month totals */}
      <Card
        className="animate-slide-up"
        style={{ animationFillMode: 'both' }}
      >
        <CardContent className="py-4 px-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            This month
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Earned</p>
              <p className="text-xl font-bold text-foreground tabular-nums mt-0.5">
                ${earned.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Outstanding</p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums mt-0.5">
                ${outstanding.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Collected</p>
              <p className="text-xl font-bold text-muted-foreground tabular-nums mt-0.5">$0</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Income by clinic */}
      <Card
        className="animate-slide-up"
        style={{ animationDelay: '120ms', animationFillMode: 'both' }}
      >
        <CardContent className="py-4 px-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Building2 className="h-3 w-3" /> Income by clinic
          </p>
          <div className="space-y-2.5">
            {byClinic.map(row => (
              <div key={row.facility!.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground truncate">{row.facility!.name}</span>
                  <span className="font-semibold tabular-nums">${row.amount.toLocaleString()}</span>
                </div>
                <Progress value={row.percent} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* At a glance */}
      <Card
        className="animate-slide-up"
        style={{ animationDelay: '240ms', animationFillMode: 'both' }}
      >
        <CardContent className="py-4 px-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3" /> At a glance
          </p>
          <p className="text-sm text-foreground">
            <span className="font-semibold">{sessionShifts.length}</span>{' '}
            {sessionShifts.length === 1 ? 'shift' : 'shifts'}
            {' · '}
            <span className="font-semibold">{Math.round(totalHours)}</span> hours
            {sessionShifts.length > 0 && (
              <>
                {' · '}avg <span className="font-semibold">${Math.round(avgPerShift).toLocaleString()}</span>/shift
              </>
            )}
          </p>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground text-center px-4">
        The more you log, the sharper the picture. You can dive deeper anytime in the
        Relief Business Hub.
      </p>
    </div>
  );
}
