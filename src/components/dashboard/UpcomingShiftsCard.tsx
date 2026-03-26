import { Card, CardContent } from '@/components/ui/card';
import { CalendarDays, Clock, MapPin, ArrowRight } from 'lucide-react';
import { format, isToday, isTomorrow, addDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

interface Shift {
  id: string;
  start_datetime: string;
  end_datetime: string;
  facility_id: string;
  status: string;
  agency?: string;
}

interface UpcomingShiftsCardProps {
  shifts: Shift[];
  getFacilityName: (id: string) => string;
}

function getRelativeDay(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEE, MMM d');
}

export function UpcomingShiftsCard({ shifts, getFacilityName }: UpcomingShiftsCardProps) {
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
    <Card className="h-full flex flex-col">
      <CardContent className="p-5 flex flex-col flex-1">
        {/* Greeting area with next shift context */}
        <div className="mb-4">
          {nextShift ? (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Your day is open.</p>
              <p className="text-sm text-muted-foreground">
                Next shift:{' '}
                <span className="font-medium text-foreground">
                  {getRelativeDay(new Date(nextShift.start_datetime))}
                </span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No shifts scheduled this week.</p>
          )}
        </div>

        {/* Next 7 Days */}
        <div className="flex-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Next 7 Days
          </p>

          {upcoming.length === 0 ? (
            <div className="py-6 text-center">
              <CalendarDays className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No upcoming shifts</p>
            </div>
          ) : (
            <div className="space-y-1">
              {upcoming.map((shift) => {
                const startDate = new Date(shift.start_datetime);
                const endDate = new Date(shift.end_datetime);
                const facilityName = getFacilityName(shift.facility_id);
                const initials = facilityName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                const isShiftToday = isToday(startDate);

                return (
                  <div
                    key={shift.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors group
                      ${isShiftToday ? 'bg-primary/5 border border-primary/20' : 'hover:bg-muted/50'}`}
                    onClick={() => navigate('/schedule')}
                  >
                    {/* Avatar */}
                    <div className="shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">{initials}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate leading-tight">{facilityName}</p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <span>{getRelativeDay(startDate)}</span>
                        <span>•</span>
                        <Clock className="h-3 w-3" />
                        <span>{format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}</span>
                      </div>
                    </div>

                    {/* Agency badge */}
                    {shift.agency && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 shrink-0 border-primary/30 text-primary">
                        {shift.agency}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* View all link */}
        {upcoming.length > 0 && (
          <button
            className="flex items-center gap-1 text-xs text-primary font-medium hover:underline mt-3 pt-2 border-t border-border"
            onClick={() => navigate('/schedule')}
          >
            View full schedule <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </CardContent>
    </Card>
  );
}
