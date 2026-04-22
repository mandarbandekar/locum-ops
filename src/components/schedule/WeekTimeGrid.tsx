import { useState, useRef, useCallback, useMemo, DragEvent } from 'react';
import { AlertTriangle } from 'lucide-react';
import { format, isSameDay, getHours, getMinutes } from 'date-fns';
import { SHIFT_COLORS, BLOCK_COLORS, BLOCK_TYPES, TimeBlock } from '@/types';
import { getMarkersForDay } from '@/lib/calendarMarkers';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarEvent } from '@/hooks/useCalendarEvents';
import { CalendarEventStack } from '@/components/schedule/CalendarEventChip';

const HOURS = Array.from({ length: 18 }, (_, i) => i + 5); // 5 AM – 10 PM
const HOUR_HEIGHT = 60; // px per hour
const GUTTER_WIDTH = 56; // px for time labels

interface WeekTimeGridProps {
  weekDays: Date[];
  shifts: any[];
  getFacilityName: (id: string) => string;
  onEditShift: (id: string) => void;
  onDropOnTime: (shiftId: string, targetDate: Date, targetHour: number) => void;
  onCellClick?: (date: Date, hour: number) => void;
  calendarFilters?: { credentials: boolean; subscriptions: boolean };
  getEventsForDay?: (day: Date, filters: { credentials: boolean; subscriptions: boolean }) => CalendarEvent[];
  timeBlocks?: TimeBlock[];
  onEditBlock?: (id: string) => void;
}

export function WeekTimeGrid({ weekDays, shifts, getFacilityName, onEditShift, onDropOnTime, onCellClick, calendarFilters, getEventsForDay, timeBlocks = [], onEditBlock }: WeekTimeGridProps) {
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const onDragStart = (e: DragEvent, shiftId: string) => {
    e.dataTransfer.setData('text/plain', shiftId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = useCallback((e: DragEvent, dayIndex: number, hour: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCell(`${dayIndex}-${hour}`);
  }, []);

  const handleDrop = useCallback((e: DragEvent, dayIndex: number, hour: number) => {
    e.preventDefault();
    const shiftId = e.dataTransfer.getData('text/plain');
    if (!shiftId) return;

    // Calculate precise hour from mouse position within the cell
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const yOffset = e.clientY - rect.top;
    const fractionOfHour = yOffset / HOUR_HEIGHT;
    const preciseHour = hour + Math.max(0, Math.min(fractionOfHour, 0.99));

    onDropOnTime(shiftId, weekDays[dayIndex], preciseHour);
    setDragOverCell(null);
  }, [weekDays, onDropOnTime]);

  const doubleBookedDays = useMemo(() => {
    const result = new Set<number>();
    weekDays.forEach((day, di) => {
      const dayShifts = shifts.filter(s => isSameDay(new Date(s.start_datetime), day) && s.status !== 'canceled');
      for (let i = 0; i < dayShifts.length; i++) {
        for (let j = i + 1; j < dayShifts.length; j++) {
          const aS = new Date(dayShifts[i].start_datetime).getTime();
          const aE = new Date(dayShifts[i].end_datetime).getTime();
          const bS = new Date(dayShifts[j].start_datetime).getTime();
          const bE = new Date(dayShifts[j].end_datetime).getTime();
          if (aS < bE && bS < aE) { result.add(di); break; }
        }
        if (result.has(di)) break;
      }
    });
    return result;
  }, [weekDays, shifts]);

  return (
    <div className="rounded-lg border bg-card overflow-x-auto -mx-3 sm:mx-0">
      {/* Day headers */}
      <div className="grid bg-muted/50 min-w-[700px]" style={{ gridTemplateColumns: `${GUTTER_WIDTH}px repeat(7, 1fr)` }}>
        <div className="p-2 border-r" />
        {weekDays.map((d, di) => {
          const isToday = isSameDay(d, new Date());
          const isConflict = doubleBookedDays.has(di);
          return (
            <div
              key={d.toISOString()}
              className={`p-2 text-center border-r last:border-r-0 ${isToday ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <div className="text-xs font-medium flex items-center justify-center gap-1">
                {format(d, 'EEE')}
                {isConflict && (
                  <span title="Overlapping shifts">
                    <AlertTriangle className="h-3 w-3 text-accent" />
                  </span>
                )}
              </div>
              <div className={`text-lg font-semibold leading-none mt-0.5 ${isToday ? 'bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto' : ''}`}>
                {format(d, 'd')}
              </div>
            </div>
          );
        })}
      </div>

      {/* All-day calendar events row */}
      {calendarFilters && getEventsForDay && (calendarFilters.credentials || calendarFilters.subscriptions) && (
        <div className="grid border-t min-w-[700px]" style={{ gridTemplateColumns: `${GUTTER_WIDTH}px repeat(7, 1fr)` }}>
          <div className="p-1 border-r text-[9px] text-muted-foreground text-right pr-2">All day</div>
          {weekDays.map(d => {
            const events = getEventsForDay(d, calendarFilters);
            return (
              <div key={d.toISOString()} className="p-0.5 border-r last:border-r-0 min-h-[24px]">
                <CalendarEventStack events={events} maxVisible={2} />
              </div>
            );
          })}
        </div>
      )}

      {/* Time grid body */}
      <ScrollArea className="h-[600px]">
        <div ref={gridRef} className="relative min-w-[700px]" style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}>
          {/* Hour rows – grid lines + labels + drop zones */}
          {HOURS.map((hour, rowIdx) => (
            <div
              key={hour}
              className="absolute left-0 right-0 flex"
              style={{ top: `${rowIdx * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
            >
              {/* Time label */}
              <div
                className="shrink-0 text-[10px] text-muted-foreground text-right pr-2 border-r relative"
                style={{ width: `${GUTTER_WIDTH}px` }}
              >
                <span className="absolute -top-2 right-2">
                  {format(new Date(2026, 0, 1, hour), 'h a')}
                </span>
              </div>

              {/* Day columns – each is a drop zone */}
              <div className="flex-1 grid grid-cols-7">
                {weekDays.map((day, di) => {
                  const markers = getMarkersForDay(day);
                  const cellKey = `${di}-${hour}`;
                  const isDragOver = dragOverCell === cellKey;
                  return (
                    <div
                      key={di}
                      className={`border-t border-r last:border-r-0 relative transition-colors ${isDragOver ? 'bg-primary/10' : ''}`}
                      onDragOver={(e) => handleDragOver(e, di, hour)}
                      onDragLeave={() => setDragOverCell(null)}
                      onDrop={(e) => handleDrop(e, di, hour)}
                      onClick={() => onCellClick?.(weekDays[di], hour)}
                    >
                      {/* Half-hour dashed line */}
                      <div
                        className="absolute left-0 right-0 border-t border-dashed border-muted/40 pointer-events-none"
                        style={{ top: `${HOUR_HEIGHT / 2}px` }}
                      />
                      {/* Holiday/tax markers in first hour slot */}
                      {hour === HOURS[0] && markers.map(m => (
                        <div
                          key={m.label}
                          className={`absolute top-0.5 left-0.5 right-0.5 text-[9px] px-1 py-0.5 rounded truncate font-medium z-10 pointer-events-none ${m.bg} ${m.text}`}
                          title={m.label}
                        >
                          {m.type === 'tax' ? '💰' : '🔴'} {m.label}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Shift blocks – absolutely positioned over the grid */}
          {weekDays.map((day, dayIndex) => {
            const dayShifts = shifts.filter(s => isSameDay(new Date(s.start_datetime), day));
            return dayShifts.map(s => {
              const start = new Date(s.start_datetime);
              const end = new Date(s.end_datetime);
              const startHour = getHours(start) + getMinutes(start) / 60;
              const endHour = getHours(end) + getMinutes(end) / 60;
              const topOffset = (startHour - HOURS[0]) * HOUR_HEIGHT;
              const height = Math.max((endHour - startHour) * HOUR_HEIGHT, 24);
              const colorDef = SHIFT_COLORS.find(c => c.value === (s.color || 'blue')) || SHIFT_COLORS[0];

              const leftCalc = `calc(${GUTTER_WIDTH}px + (100% - ${GUTTER_WIDTH}px) * ${dayIndex} / 7 + 2px)`;
              const widthCalc = `calc((100% - ${GUTTER_WIDTH}px) / 7 - 4px)`;

              return (
                <div
                  key={s.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, s.id)}
                  className={`absolute rounded-md cursor-grab active:cursor-grabbing px-1.5 py-1 overflow-hidden text-xs leading-tight z-20 border border-background/20 shadow-sm hover:shadow-md hover:z-30 transition-all select-none ${colorDef.bg} ${colorDef.text}`}
                  style={{
                    top: `${topOffset}px`,
                    height: `${height}px`,
                    left: leftCalc,
                    width: widthCalc,
                  }}
                  onClick={() => onEditShift(s.id)}
                  title={`${getFacilityName(s.facility_id)}\n${format(start, 'h:mm a')} – ${format(end, 'h:mm a')}\nDrag to reschedule`}
                >
                  <div className="font-semibold truncate">{getFacilityName(s.facility_id)}</div>
                  {height >= 40 && (
                    <div className="opacity-80 truncate text-[10px]">
                      {format(start, 'h:mm a')} – {format(end, 'h:mm a')}
                    </div>
                  )}
                  {height >= 60 && (
                    <div className="opacity-70 truncate text-[10px] mt-0.5">${s.rate_applied?.toLocaleString?.() ?? s.rate_applied}</div>
                  )}
                </div>
              );
            });
          })}

          {/* Time blocks – semi-transparent striped overlay bars */}
          {weekDays.map((day, dayIndex) => {
            const dayBlocks = timeBlocks.filter(b => {
              const bs = new Date(b.start_datetime);
              const be = new Date(b.end_datetime);
              return day >= new Date(bs.getFullYear(), bs.getMonth(), bs.getDate()) && day <= new Date(be.getFullYear(), be.getMonth(), be.getDate());
            });
            return dayBlocks.map(b => {
              const bStart = new Date(b.start_datetime);
              const bEnd = new Date(b.end_datetime);
              let startHour: number, endHour: number;
              if (b.all_day) {
                startHour = HOURS[0];
                endHour = HOURS[HOURS.length - 1] + 1;
              } else {
                startHour = isSameDay(bStart, day) ? getHours(bStart) + getMinutes(bStart) / 60 : HOURS[0];
                endHour = isSameDay(bEnd, day) ? getHours(bEnd) + getMinutes(bEnd) / 60 : HOURS[HOURS.length - 1] + 1;
              }
              const topOffset = Math.max((startHour - HOURS[0]) * HOUR_HEIGHT, 0);
              const bottomOffset = Math.min((endHour - HOURS[0]) * HOUR_HEIGHT, HOURS.length * HOUR_HEIGHT);
              const height = Math.max(bottomOffset - topOffset, 20);
              const blockColor = BLOCK_COLORS.find(c => c.value === b.color) || BLOCK_COLORS[0];
              const blockTypeInfo = BLOCK_TYPES.find(t => t.value === b.block_type);
              const leftCalc = `calc(${GUTTER_WIDTH}px + (100% - ${GUTTER_WIDTH}px) * ${dayIndex} / 7 + 1px)`;
              const widthCalc = `calc((100% - ${GUTTER_WIDTH}px) / 7 - 2px)`;

              return (
                <div
                  key={b.id}
                  className={`absolute rounded-md px-1.5 py-1 overflow-hidden text-[10px] leading-tight z-10 border border-dashed border-current/30 opacity-60 cursor-pointer hover:opacity-80 transition-opacity ${blockColor.bg} ${blockColor.text}`}
                  style={{
                    top: `${topOffset}px`,
                    height: `${height}px`,
                    left: leftCalc,
                    width: widthCalc,
                    backgroundImage: 'repeating-linear-gradient(135deg, transparent, transparent 4px, currentColor 4px, currentColor 5px)',
                    backgroundSize: '8px 8px',
                    backgroundClip: 'padding-box',
                  }}
                  onClick={() => onEditBlock?.(b.id)}
                  title={`${blockTypeInfo?.icon || ''} ${b.title}`}
                >
                  <div className="font-semibold truncate bg-background/70 rounded px-0.5 inline-block">
                    {blockTypeInfo?.icon} {b.title}
                  </div>
                </div>
              );
            });
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
