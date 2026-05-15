import { useMemo } from 'react';
import { ChevronRight, CalendarPlus } from 'lucide-react';
import { format, addDays, parseISO, startOfDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { SHIFT_COLORS, Facility } from '@/types';
import { formatYMDInTz, formatTimeInTz } from '@/lib/tzTime';

const BROWSER_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

interface AgendaViewProps {
  shifts: any[];
  facilities: Facility[];
  onShiftClick: (id: string) => void;
  onAddShift: () => void;
  /** How many days ahead from today to include. */
  daysAhead?: number;
}

export function AgendaView({ shifts, facilities, onShiftClick, onAddShift, daysAhead = 60 }: AgendaViewProps) {
  const tzForFacility = (id: string) =>
    facilities.find(f => f.id === id)?.timezone || BROWSER_TZ;
  const facilityName = (id: string) =>
    facilities.find(f => f.id === id)?.name || 'Unknown';

  const grouped = useMemo(() => {
    const today = startOfDay(new Date());
    const cutoff = addDays(today, daysAhead);
    const upcoming = shifts.filter(s => {
      const start = parseISO(s.start_datetime);
      return start >= today && start <= cutoff;
    });
    upcoming.sort((a, b) =>
      parseISO(a.start_datetime).getTime() - parseISO(b.start_datetime).getTime()
    );
    const byDay = new Map<string, any[]>();
    upcoming.forEach(s => {
      const tz = tzForFacility(s.facility_id);
      const ymd = formatYMDInTz(s.start_datetime, tz);
      const arr = byDay.get(ymd) || [];
      arr.push(s);
      byDay.set(ymd, arr);
    });
    return Array.from(byDay.entries()).map(([ymd, items]) => {
      // parse YMD as local date
      const [y, m, d] = ymd.split('-').map(Number);
      return { ymd, date: new Date(y, m - 1, d), items };
    });
  }, [shifts, facilities, daysAhead]);

  if (grouped.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CalendarPlus className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-semibold mb-1">No upcoming shifts</h3>
        <p className="text-sm text-muted-foreground max-w-xs mb-4">
          Add a shift to start tracking your schedule.
        </p>
        <Button onClick={onAddShift}>Add Shift</Button>
      </div>
    );
  }

  const todayYmd = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="space-y-5">
      {grouped.map(group => {
        const isToday = group.ymd === todayYmd;
        return (
          <section key={group.ymd}>
            <header className="flex items-baseline gap-2 mb-2 px-1">
              <span className={`inline-flex items-center justify-center min-w-7 h-7 rounded-full text-[13px] font-semibold ${
                isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'
              }`}>
                {format(group.date, 'd')}
              </span>
              <span className="text-[12px] uppercase tracking-wide font-medium text-muted-foreground">
                {format(group.date, 'EEE · MMM yyyy')}
              </span>
              {isToday && (
                <span className="text-[11px] font-medium text-primary">Today</span>
              )}
            </header>
            <ul className="space-y-1.5">
              {group.items.map(s => {
                const tz = tzForFacility(s.facility_id);
                const colorDef =
                  SHIFT_COLORS.find(c => c.value === (s.color || 'blue')) || SHIFT_COLORS[0];
                const start = formatTimeInTz(s.start_datetime, tz);
                const end = formatTimeInTz(s.end_datetime, tz);
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => onShiftClick(s.id)}
                      className="w-full flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-left hover:bg-accent/40 transition-colors"
                    >
                      <span className={`w-1 self-stretch rounded-full ${colorDef.bg}`} aria-hidden />
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-medium text-foreground truncate">
                          {facilityName(s.facility_id)}
                        </div>
                        <div className="text-[12px] text-muted-foreground truncate">
                          {start} – {end}
                          {s.rate_applied ? <> · ${Number(s.rate_applied).toLocaleString()}</> : null}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
