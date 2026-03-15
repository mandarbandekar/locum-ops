import { useState, useEffect, useCallback, DragEvent } from 'react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { Plus, ChevronLeft, ChevronRight, List, CalendarDays, Trash2, Calendar as CalendarIcon, CheckSquare } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay, startOfWeek, endOfWeek, addWeeks, subWeeks, differenceInMilliseconds } from 'date-fns';
import { SHIFT_COLORS, Shift } from '@/types';
import { toast } from 'sonner';
import { ShiftFormDialog } from '@/components/schedule/ShiftFormDialog';
import { WeekTimeGrid } from '@/components/schedule/WeekTimeGrid';
import { ConfirmationsTab } from '@/components/schedule/ConfirmationsTab';
import { getMarkersForDay } from '@/lib/calendarMarkers';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarFilters, CalendarLayerFilters } from '@/components/schedule/CalendarFilters';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { CalendarEventStack } from '@/components/schedule/CalendarEventChip';

const STORAGE_KEY = 'schedule-view-pref';

export default function SchedulePage() {
  const { shifts, facilities, terms, addShift, updateShift, deleteShift, updateFacility } = useData();
  const { getEventsForDay } = useCalendarEvents();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'list' | 'confirmations'>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved === 'month' || saved === 'week' || saved === 'list' || saved === 'confirmations') ? saved : 'month';
  });
  const [showAdd, setShowAdd] = useState(false);
  const [editShift, setEditShift] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [calendarFilters, setCalendarFilters] = useState<CalendarLayerFilters>({
    shifts: true,
    credentials: false,
    subscriptions: false,
  });

  const toggleFilter = (key: keyof CalendarLayerFilters) => {
    setCalendarFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, view);
  }, [view]);

  // Month calculations
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDow = getDay(monthStart);

  // Week calculations
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const rangeStart = view === 'week' ? weekStart : monthStart;
  const rangeEnd = view === 'week' ? weekEnd : monthEnd;

  const rangeShifts = shifts.filter(s => {
    const d = new Date(s.start_datetime);
    return d >= rangeStart && d <= rangeEnd;
  }).sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());

  const getFacilityName = (id: string) => facilities.find(c => c.id === id)?.name || 'Unknown';

  const handleSaveShift = (s: any) => {
    if (s.id) {
      updateShift(s as any);
      const facility = facilities.find(f => f.id === s.facility_id);
      if (facility && facility.status !== 'active') {
        updateFacility({ ...facility, status: 'active' });
        toast.success(`Shift updated — "${facility.name}" has been set to Active`);
      } else {
        toast.success('Shift updated');
      }
    } else {
      addShift(s);
      const facility = facilities.find(f => f.id === s.facility_id);
      if (facility && facility.status !== 'active') {
        updateFacility({ ...facility, status: 'active' });
        toast.success(`Shift added — "${facility.name}" has been set to Active`);
      } else {
        toast.success('Shift added');
      }
    }
  };

  const handleDropOnDay = useCallback((shiftId: string, targetDate: Date) => {
    const shift = shifts.find(s => s.id === shiftId);
    if (!shift) return;
    const oldStart = new Date(shift.start_datetime);
    const oldEnd = new Date(shift.end_datetime);
    const duration = differenceInMilliseconds(oldEnd, oldStart);
    const newStart = new Date(targetDate);
    newStart.setHours(oldStart.getHours(), oldStart.getMinutes(), oldStart.getSeconds(), 0);
    const newEnd = new Date(newStart.getTime() + duration);
    if (newStart.getTime() === oldStart.getTime()) return;
    updateShift({ ...shift, start_datetime: newStart.toISOString(), end_datetime: newEnd.toISOString() } as any);
    toast.success(`Shift moved to ${format(newStart, 'EEE, MMM d')}`);
    setDragOverDay(null);
  }, [shifts, updateShift]);

  const handleDropOnTime = useCallback((shiftId: string, targetDate: Date, targetHour: number) => {
    const shift = shifts.find(s => s.id === shiftId);
    if (!shift) return;
    const oldStart = new Date(shift.start_datetime);
    const oldEnd = new Date(shift.end_datetime);
    const duration = differenceInMilliseconds(oldEnd, oldStart);
    const newStart = new Date(targetDate);
    const fullHours = Math.floor(targetHour);
    const minutes = Math.round((targetHour - fullHours) * 60 / 15) * 15;
    newStart.setHours(fullHours, minutes, 0, 0);
    const newEnd = new Date(newStart.getTime() + duration);
    if (newStart.getTime() === oldStart.getTime()) return;
    updateShift({ ...shift, start_datetime: newStart.toISOString(), end_datetime: newEnd.toISOString() } as any);
    toast.success(`Shift moved to ${format(newStart, 'EEE, MMM d h:mm a')}`);
  }, [shifts, updateShift]);

  const navigateBack = () => {
    if (view === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subMonths(currentDate, 1));
  };

  const navigateForward = () => {
    if (view === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addMonths(currentDate, 1));
  };

  const headerLabel = view === 'week'
    ? `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`
    : format(currentDate, 'MMMM yyyy');

  const onDragStart = (e: DragEvent, shiftId: string) => {
    e.dataTransfer.setData('text/plain', shiftId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: DragEvent, dayKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDay(dayKey);
  };

  const onDragLeave = () => { setDragOverDay(null); };

  const onDrop = (e: DragEvent, day: Date) => {
    e.preventDefault();
    const shiftId = e.dataTransfer.getData('text/plain');
    if (shiftId) handleDropOnDay(shiftId, day);
    setDragOverDay(null);
  };

  const renderDayCell = (day: Date, minHeight: string) => {
    const dayShifts = calendarFilters.shifts ? shifts.filter(s => isSameDay(new Date(s.start_datetime), day)) : [];
    const isToday = isSameDay(day, new Date());
    const markers = getMarkersForDay(day);
    const dayKey = day.toISOString();
    const isDragOver = dragOverDay === dayKey;
    const calEvents = getEventsForDay(day, { credentials: calendarFilters.credentials, subscriptions: calendarFilters.subscriptions });

    return (
      <div
        key={dayKey}
        className={`${minHeight} border-t border-r p-1 transition-colors ${isToday ? 'bg-primary/5' : ''} ${isDragOver ? 'bg-primary/10 ring-2 ring-inset ring-primary/30' : ''}`}
        onDragOver={(e) => onDragOver(e, dayKey)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, day)}
      >
        <div className={`text-xs font-medium mb-1 ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
          {format(day, 'd')}
        </div>
        {markers.map(m => (
          <div key={m.label} className={`text-[10px] px-1 py-0.5 rounded mb-0.5 truncate font-medium ${m.bg} ${m.text}`} title={m.label}>
            {m.type === 'tax' ? '💰' : '🔴'} {m.label}
          </div>
        ))}
        {dayShifts.map(s => {
          const colorDef = SHIFT_COLORS.find(c => c.value === (s.color || 'blue')) || SHIFT_COLORS[0];
          return (
            <div
              key={s.id}
              draggable
              onDragStart={(e) => onDragStart(e, s.id)}
              className={`text-xs p-1 rounded mb-0.5 cursor-grab active:cursor-grabbing truncate ${colorDef.bg} ${colorDef.text} hover:opacity-80 transition-opacity select-none`}
              onClick={() => setEditShift(s.id)}
              title={`${getFacilityName(s.facility_id)} — drag to reschedule`}
            >
              {format(new Date(s.start_datetime), 'ha')} {getFacilityName(s.facility_id).split(' ')[0]}
            </div>
          );
        })}
        <CalendarEventStack events={calEvents} maxVisible={2} />
      </div>
    );
  };

  return (
    <div>
      <div className="page-header flex-col sm:flex-row gap-3">
        <h1 className="page-title">Schedule</h1>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant={view === 'month' ? 'default' : 'outline'} onClick={() => setView('month')}>
            <CalendarDays className="mr-1 h-4 w-4" /> Month
          </Button>
          <Button size="sm" variant={view === 'week' ? 'default' : 'outline'} onClick={() => setView('week')}>
            <CalendarIcon className="mr-1 h-4 w-4" /> Week
          </Button>
          <Button size="sm" variant={view === 'list' ? 'default' : 'outline'} onClick={() => setView('list')}>
            <List className="mr-1 h-4 w-4" /> List
          </Button>
          <Button size="sm" variant={view === 'confirmations' ? 'default' : 'outline'} onClick={() => setView('confirmations')}>
            <CheckSquare className="mr-1 h-4 w-4" /> Confirmations
          </Button>
          {view !== 'confirmations' && (
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="mr-1 h-4 w-4" /> Add Shift
            </Button>
          )}
        </div>
      </div>

      {view === 'confirmations' ? (
        <ConfirmationsTab />
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={navigateBack}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{headerLabel}</h2>
              <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setCurrentDate(new Date())}>
                Today
              </Button>
            </div>
            <Button variant="ghost" size="icon" onClick={navigateForward}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="mb-4">
            <CalendarFilters filters={calendarFilters} onToggle={toggleFilter} />
          </div>

          {view === 'month' ? (
            <div className="rounded-lg border bg-card overflow-hidden">
              <div className="grid grid-cols-7 bg-muted/50">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {Array.from({ length: startDow }).map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-[80px] border-t border-r bg-muted/20" />
                ))}
                {monthDays.map(day => renderDayCell(day, 'min-h-[80px]'))}
              </div>
            </div>
          ) : view === 'week' ? (
            <WeekTimeGrid
              weekDays={weekDays}
              shifts={calendarFilters.shifts ? shifts : []}
              getFacilityName={getFacilityName}
              onEditShift={setEditShift}
              onDropOnTime={handleDropOnTime}
              calendarFilters={{ credentials: calendarFilters.credentials, subscriptions: calendarFilters.subscriptions }}
              getEventsForDay={getEventsForDay}
            />
          ) : (
            <div className="rounded-lg border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Facility</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Time</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Rate</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="w-10" />
                </tr></thead>
                <tbody>
                  {rangeShifts.map(s => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => setEditShift(s.id)}>
                      <td className="p-3">{format(new Date(s.start_datetime), 'EEE, MMM d')}</td>
                      <td className="p-3 font-medium">{getFacilityName(s.facility_id)}</td>
                      <td className="p-3 text-muted-foreground hidden md:table-cell">{format(new Date(s.start_datetime), 'h:mm a')} - {format(new Date(s.end_datetime), 'h:mm a')}</td>
                      <td className="p-3">${s.rate_applied}</td>
                      <td className="p-3"><StatusBadge status={s.status} /></td>
                      <td className="p-3" onClick={e => e.stopPropagation()}>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this shift?</AlertDialogTitle>
                              <AlertDialogDescription>{getFacilityName(s.facility_id)} — {format(new Date(s.start_datetime), 'MMM d, yyyy')}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => { deleteShift(s.id); toast.success('Shift deleted'); }}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    </tr>
                  ))}
                  {rangeShifts.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No shifts to display</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <ShiftFormDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        facilities={facilities}
        shifts={shifts}
        terms={terms}
        onSave={handleSaveShift}
      />

      {editShift && (
        <ShiftFormDialog
          open={!!editShift}
          onOpenChange={() => setEditShift(null)}
          facilities={facilities}
          shifts={shifts}
          terms={terms}
          existing={shifts.find(s => s.id === editShift)}
          onSave={handleSaveShift}
          onDelete={(id) => { deleteShift(id); setEditShift(null); toast.success('Shift deleted'); }}
        />
      )}
    </div>
  );
}
