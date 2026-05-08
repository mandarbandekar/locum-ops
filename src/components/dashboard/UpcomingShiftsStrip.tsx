import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { CalendarPlus } from 'lucide-react';

export interface UpcomingShiftItem {
  id: string;
  date: Date;
  clinicName: string;
  startTime: string; // already formatted "8:00 AM"
  endTime: string;   // already formatted "6:00 PM"
}

interface UpcomingShiftsStripProps {
  shifts: UpcomingShiftItem[];
}

export function UpcomingShiftsStrip({ shifts }: UpcomingShiftsStripProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2
          className="font-semibold text-foreground"
          style={{ fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif', fontSize: '16px' }}
        >
          Coming Up
        </h2>
        <Link
          to="/schedule"
          className="text-[12px] font-medium hover:underline"
          style={{ color: '#1A5C6B' }}
        >
          View Schedule →
        </Link>
      </div>

      {shifts.length === 0 ? (
        <Link
          to="/schedule"
          className="block max-w-[300px] bg-card rounded-md shadow-sm border border-border-subtle p-3 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-2">
            <CalendarPlus className="h-4 w-4" style={{ color: '#1A5C6B' }} />
            <div>
              <p className="text-[13px] font-semibold text-foreground">No upcoming shifts</p>
              <p className="text-[11px] mt-0.5" style={{ color: '#1A5C6B' }}>Book a shift →</p>
            </div>
          </div>
        </Link>
      ) : (
        <div className="flex gap-3 overflow-x-auto md:overflow-visible snap-x snap-mandatory pb-1">
          {shifts.slice(0, 5).map(s => (
            <div
              key={s.id}
              className="snap-start shrink-0 bg-card rounded-md shadow-sm border border-border-subtle p-3"
              style={{ width: '140px' }}
            >
              <p className="text-[11px] font-semibold" style={{ color: '#1A5C6B' }}>
                {format(s.date, 'EEE, MMM d')}
              </p>
              <p className="text-[13px] font-semibold text-foreground mt-1 truncate" title={s.clinicName}>
                {s.clinicName}
              </p>
              <p className="text-[11px] mt-1" style={{ color: '#6B7280' }}>
                {s.startTime} - {s.endTime}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
