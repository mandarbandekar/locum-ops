import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarDays, Clock, Plus, ChevronDown } from 'lucide-react';
import { format, isToday, isTomorrow, addDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Shift {
  id: string;
  start_datetime: string;
  end_datetime: string;
  facility_id: string;
  agency?: string;
}

interface UpcomingShiftsCardProps {
  shifts: Shift[];
  getFacilityName: (id: string) => string;
  greeting: string;
  firstName: string;
}

function getRelativeDay(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEE, MMM d');
}

const ACCENT_COLORS = [
  'border-l-primary',
  'border-l-warning',
  'border-l-info',
  'border-l-success',
  'border-l-destructive',
];

export function UpcomingShiftsCard({ shifts, getFacilityName, greeting, firstName }: UpcomingShiftsCardProps) {
  const navigate = useNavigate();
  const now = new Date();
  const in7Days = addDays(now, 7);
  const [shiftsOpen, setShiftsOpen] = useState(false);

  const upcoming = shifts
    .filter(s =>
      new Date(s.start_datetime) >= now &&
      new Date(s.start_datetime) <= in7Days
    )
    .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())
    .slice(0, 5);

  const nextShift = upcoming[0];

  return (
    <Card className="flex flex-col border-0 shadow-md h-full overflow-hidden">
      <CardContent className="p-0 flex flex-col flex-1 min-h-0">
        {/* Greeting header */}
        <div className="px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold tracking-tight text-foreground">{greeting}</h2>
            </div>
          </div>
          {nextShift ? (
            <div className="space-y-0.5 text-sm text-muted-foreground">
              <p>
                Next shift: <span className="font-semibold text-foreground">{getRelativeDay(new Date(nextShift.start_datetime))}</span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No shifts scheduled this week.</p>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-border mx-5 shrink-0" />

        {/* Collapsible Upcoming Shifts */}
        <Collapsible open={shiftsOpen} onOpenChange={setShiftsOpen} className="flex-1 min-h-0 flex flex-col">
          <CollapsibleTrigger className="px-5 pt-3 pb-2 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors shrink-0">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.08em]">
              Next 7 Days
            </p>
            <div className="flex items-center gap-1.5">
              {upcoming.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                  {upcoming.length}
                </Badge>
              )}
              <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${shiftsOpen ? 'rotate-180' : ''}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="flex-1 min-h-0 overflow-auto">
            <div className="px-5 pb-2">
              {upcoming.length === 0 ? (
                <div className="py-4 text-center">
                  <CalendarDays className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">No upcoming shifts</p>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/schedule')}>
                    <Plus className="h-3.5 w-3.5" /> Add Shift
                  </Button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {upcoming.map((shift, idx) => {
                    const startDate = new Date(shift.start_datetime);
                    const endDate = new Date(shift.end_datetime);
                    const facilityName = getFacilityName(shift.facility_id);
                    const initials = facilityName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

                    return (
                      <div
                        key={shift.id}
                        className={`flex items-center gap-3 p-2.5 rounded-lg border-l-[3px] cursor-pointer transition-all
                          hover:bg-muted/40 hover:shadow-sm bg-card
                          ${ACCENT_COLORS[idx % ACCENT_COLORS.length]}`}
                        onClick={() => navigate('/schedule')}
                      >
                        <div className="shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-[10px] font-bold text-muted-foreground">{initials}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold truncate leading-tight">{facilityName}</p>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                            <span className="font-medium">{getRelativeDay(startDate)}</span>
                            <span className="opacity-50">•</span>
                            <Clock className="h-2.5 w-2.5 opacity-60" />
                            <span>{format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}</span>
                          </div>
                        </div>
                        {shift.agency && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 shrink-0 border-primary/30 text-primary font-medium">
                            {shift.agency}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Footer - single CTA */}
        <div className="px-5 pb-4 pt-2 shrink-0 mt-auto border-t border-border/50">
          <Button
            className="w-full h-9 text-[12px] font-bold gap-2 shadow-sm"
            onClick={() => navigate('/schedule?addShift=true')}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Shift
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
