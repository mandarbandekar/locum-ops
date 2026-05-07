import { format, differenceInHours } from 'date-fns';
import { Shift, TimeBlock, SHIFT_COLORS, BLOCK_COLORS, BLOCK_TYPES } from '@/types';
import { CalendarEvent } from '@/hooks/useCalendarEvents';
import { CalendarMarker } from '@/lib/calendarMarkers';
import { Plus, Ban, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DayPeekProps {
  day: Date;
  shifts: Shift[];
  blocks: TimeBlock[];
  events: CalendarEvent[];
  markers: CalendarMarker[];
  getFacilityName: (id: string) => string;
  onEditShift: (id: string) => void;
  onEditBlock: (id: string) => void;
  onAddShift: () => void;
  onBlockTime: () => void;
  onOpenDay: () => void;
}

export function DayPeekContent({ day, shifts, blocks, events, markers, getFacilityName, onEditShift, onEditBlock, onAddShift, onBlockTime, onOpenDay }: DayPeekProps) {
  const totalRevenue = shifts.reduce((s, sh) => s + (sh.rate_applied || 0), 0);
  const totalHours = shifts.reduce((sum, s) => {
    let end = new Date(s.end_datetime);
    const start = new Date(s.start_datetime);
    if (end.getTime() <= start.getTime()) end = new Date(end.getTime() + 86400000);
    return sum + Math.max(0, differenceInHours(end, start));
  }, 0);

  return (
    <div className="w-72 p-3 space-y-2.5">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{format(day, 'EEEE')}</div>
          <div className="text-[15px] font-semibold">{format(day, 'MMM d, yyyy')}</div>
        </div>
        {shifts.length > 0 && (
          <div className="text-right">
            <div className="text-[11px] text-muted-foreground">{totalHours}h</div>
            <div className="text-[13px] font-semibold">${totalRevenue.toLocaleString()}</div>
          </div>
        )}
      </div>

      {markers.length > 0 && (
        <div className="space-y-1">
          {markers.map(m => (
            <div key={m.label} className={`text-[11px] px-2 py-1 rounded font-medium ${m.bg} ${m.text}`}>
              {m.type === 'tax' ? '💰' : '🔴'} {m.label}
            </div>
          ))}
        </div>
      )}

      {blocks.length > 0 && (
        <div className="space-y-1">
          {blocks.map(b => {
            const c = BLOCK_COLORS.find(x => x.value === b.color) || BLOCK_COLORS[0];
            const t = BLOCK_TYPES.find(x => x.value === b.block_type);
            return (
              <button
                key={b.id}
                onClick={() => onEditBlock(b.id)}
                className={`w-full text-left text-[12px] px-2 py-1 rounded ${c.bg} ${c.text} border border-dashed border-current/20`}
              >
                {t?.icon || '🔒'} {b.title}
              </button>
            );
          })}
        </div>
      )}

      {shifts.length > 0 ? (
        <div className="space-y-1">
          {shifts.map(s => {
            const c = SHIFT_COLORS.find(x => x.value === (s.color || 'blue')) || SHIFT_COLORS[0];
            const start = new Date(s.start_datetime);
            let end = new Date(s.end_datetime);
            if (end.getTime() <= start.getTime()) end = new Date(end.getTime() + 86400000);
            return (
              <button
                key={s.id}
                onClick={() => onEditShift(s.id)}
                className={`w-full text-left text-[12px] px-2 py-1.5 rounded ${c.bg} ${c.text}`}
              >
                <div className="font-semibold truncate">{getFacilityName(s.facility_id)}</div>
                <div className="opacity-80 text-[11px]">
                  {format(start, 'h:mm a')} – {format(end, 'h:mm a')} · ${s.rate_applied?.toLocaleString?.()}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-[12px] text-muted-foreground text-center py-2">No shifts scheduled</div>
      )}

      {events.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-border/60">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Reminders</div>
          {events.map(e => (
            <div key={`${e.type}-${e.id}`} className="text-[12px] truncate">
              {e.type === 'credential' ? '🛡️' : '🔄'} {e.label}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-1 pt-1 border-t border-border/60">
        <Button size="sm" variant="outline" className="flex-1 h-7 text-[11px]" onClick={onAddShift}>
          <Plus className="h-3 w-3 mr-1" /> Shift
        </Button>
        <Button size="sm" variant="outline" className="flex-1 h-7 text-[11px]" onClick={onBlockTime}>
          <Ban className="h-3 w-3 mr-1" /> Block
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onOpenDay} title="Open day view">
          <CalendarDays className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
