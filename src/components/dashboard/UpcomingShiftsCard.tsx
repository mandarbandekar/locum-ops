import { Card, CardContent } from '@/components/ui/card';
import { CalendarDays, Clock, ArrowRight, Plus, FileText, BookOpen, Flame } from 'lucide-react';
import { format, isToday, isTomorrow, addDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

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
  streakDays?: number;
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

export function UpcomingShiftsCard({ shifts, getFacilityName, greeting, firstName, streakDays = 0 }: UpcomingShiftsCardProps) {
  const navigate = useNavigate();
  const now = new Date();
  const in7Days = addDays(now, 7);

  const upcoming = shifts
    .filter(s =>
      new Date(s.start_datetime) >= now &&
      new Date(s.start_datetime) <= in7Days &&
      (s.status === 'booked' || s.status === 'proposed')
    )
    .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())
    .slice(0, 5);

  const nextShift = upcoming[0];

  return (
    <Card className="flex flex-col border-0 shadow-md">
      <CardContent className="p-0 flex flex-col flex-1">
        {/* Greeting header */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold tracking-tight text-foreground">{greeting}</h2>
              {streakDays > 1 && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Flame className="h-3 w-3 text-warning" />
                  <span className="text-[11px] font-semibold text-warning">{streakDays}-day streak</span>
                </div>
              )}
            </div>
          </div>
          {nextShift ? (
            <div className="space-y-0.5 text-sm text-muted-foreground">
              <p>Your day is open.</p>
              <p>
                Next shift: <span className="font-semibold text-foreground">{getRelativeDay(new Date(nextShift.start_datetime))}</span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No shifts scheduled this week.</p>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-border mx-5" />

        {/* Next 7 Days */}
        <div className="px-5 pt-4 pb-2 flex-1">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.08em] mb-3">
            Next 7 Days
          </p>

          {upcoming.length === 0 ? (
            <div className="py-8 text-center">
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
                    className={`flex items-center gap-3 p-3 rounded-lg border-l-[3px] cursor-pointer transition-all
                      hover:bg-muted/40 hover:shadow-sm bg-card
                      ${ACCENT_COLORS[idx % ACCENT_COLORS.length]}`}
                    onClick={() => navigate('/schedule')}
                  >
                    <div className="shrink-0 w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-[11px] font-bold text-muted-foreground">{initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate leading-tight">{facilityName}</p>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                        <span className="font-medium">{getRelativeDay(startDate)}</span>
                        <span className="opacity-50">•</span>
                        <Clock className="h-3 w-3 opacity-60" />
                        <span>{format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}</span>
                      </div>
                    </div>
                    {shift.agency && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 shrink-0 border-primary/30 text-primary font-medium">
                        {shift.agency}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with integrated quick actions */}
        <div className="px-5 pb-5 pt-4 space-y-3">
          <Button
            className="w-full h-10 text-[13px] font-bold gap-2 shadow-sm"
            onClick={() => navigate('/schedule?addShift=true')}
          >
            <Plus className="h-4 w-4" />
            Add Shift
          </Button>
          <div className="flex items-center justify-center gap-4">
            <button
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium hover:text-foreground transition-colors"
              onClick={() => navigate('/invoices')}
            >
              <FileText className="h-3 w-3" /> + Invoice
            </button>
            <span className="text-muted-foreground/30">|</span>
            <button
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium hover:text-foreground transition-colors"
              onClick={() => navigate('/credentials?tab=ce')}
            >
              <BookOpen className="h-3 w-3" /> + CE Entry
            </button>
          </div>
          <button
            className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline mx-auto"
            onClick={() => navigate('/schedule')}
          >
            View full schedule <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
