import React, { useState, useEffect, useCallback, useMemo, DragEvent } from 'react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { Plus, ChevronLeft, ChevronRight, List, CalendarDays, Trash2, Calendar as CalendarIcon, CheckSquare, RefreshCw, AlertTriangle, Ban } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay, startOfWeek, endOfWeek, addWeeks, subWeeks, differenceInMilliseconds, differenceInHours } from 'date-fns';
import { CalendarPlus, Clock, DollarSign, TrendingUp } from 'lucide-react';
import { SHIFT_COLORS, Shift, BLOCK_TYPES, BLOCK_COLORS, TimeBlock } from '@/types';
import { detectShiftConflicts } from '@/lib/businessLogic';
import { toast } from 'sonner';
import { ShiftFormDialog } from '@/components/schedule/ShiftFormDialog';
import { BlockTimeDialog } from '@/components/schedule/BlockTimeDialog';
import { WeekTimeGrid } from '@/components/schedule/WeekTimeGrid';
import { ClinicConfirmationsTab } from '@/components/schedule/ClinicConfirmationsTab';
import { getMarkersForDay } from '@/lib/calendarMarkers';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarFilters, CalendarLayerFilters } from '@/components/schedule/CalendarFilters';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { CalendarEventStack } from '@/components/schedule/CalendarEventChip';
import { CalendarSyncPanel } from '@/components/schedule/CalendarSyncPanel';
import { useTaxIntelligence } from '@/hooks/useTaxIntelligence';
import { computeEffectiveSetAsideRate } from '@/lib/taxNudge';
import { ShiftTaxNudge, ShiftTaxSummaryFooter } from '@/components/schedule/ShiftTaxNudge';
import { TooltipProvider } from '@/components/ui/tooltip';

const STORAGE_KEY = 'schedule-view-pref';

export default function SchedulePage() {
  const { shifts, facilities, terms, addShift, updateShift, deleteShift, updateFacility, timeBlocks, addTimeBlock, updateTimeBlock, deleteTimeBlock, invoices, lineItems } = useData();
  const { getEventsForDay } = useCalendarEvents();
  const { profile: taxProfile, hasProfile: hasTaxProfile } = useTaxIntelligence();

  // Build set of paid shift IDs and compute effective rate
  const paidShiftIds = useMemo(() => {
    const paidInvoiceIds = new Set(invoices.filter(inv => inv.status === 'paid').map(inv => inv.id));
    const ids = new Set<string>();
    lineItems.forEach(li => {
      if (li.shift_id && paidInvoiceIds.has(li.invoice_id)) ids.add(li.shift_id);
    });
    return ids;
  }, [invoices, lineItems]);

  const ytdPaidIncome = useMemo(() => {
    const yr = new Date().getFullYear();
    return shifts
      .filter(s => paidShiftIds.has(s.id) && new Date(s.start_datetime).getFullYear() === yr)
      .reduce((sum, s) => sum + (s.rate_applied || 0), 0);
  }, [shifts, paidShiftIds]);

  const effectiveRate = useMemo(() => {
    if (!hasTaxProfile || !taxProfile) return 0.25;
    const totalIncome = invoices
      .filter(inv => inv.status === 'paid' && inv.paid_at && new Date(inv.paid_at).getFullYear() === new Date().getFullYear())
      .reduce((sum, inv) => sum + inv.total_amount, 0)
      + shifts.filter(s => new Date(s.start_datetime) >= new Date()).reduce((sum, s) => sum + (s.rate_applied || 0), 0);
    return computeEffectiveSetAsideRate(taxProfile, totalIncome || 1);
  }, [taxProfile, hasTaxProfile, invoices, shifts]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'list' | 'confirmations' | 'sync'>('month');
  const [showAdd, setShowAdd] = useState(false);
  const [showBlockTime, setShowBlockTime] = useState(false);
  const [editBlock, setEditBlock] = useState<string | null>(null);
  const [addShiftDefaults, setAddShiftDefaults] = useState<{ date?: Date; startTime?: string }>({});
  const [editShift, setEditShift] = useState<string | null>(null);
  const [blockTimeDefaultDate, setBlockTimeDefaultDate] = useState<Date | undefined>(undefined);
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

  const activeRangeShifts = rangeShifts;
  const totalShiftsInRange = activeRangeShifts.length;
  const totalHoursInRange = activeRangeShifts.reduce((sum, s) => {
    return sum + Math.max(0, differenceInHours(new Date(s.end_datetime), new Date(s.start_datetime)));
  }, 0);
  const totalRevenueInRange = activeRangeShifts.reduce((sum, s) => sum + (s.rate_applied || 0), 0);

  const getFacilityName = (id: string) => facilities.find(c => c.id === id)?.name || 'Unknown';

  const handleSaveShift = async (s: any) => {
    if (s.id) {
      await updateShift(s as any);
      toast.success('Shift updated');
    } else {
      await addShift(s);
      toast.success('Shift added');
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
    const otherShifts = shifts.filter(s => s.id !== shiftId);
    const conflicts = detectShiftConflicts(otherShifts, { start_datetime: newStart.toISOString(), end_datetime: newEnd.toISOString() });
    if (conflicts.length > 0) {
      toast.warning(`Scheduling conflict on ${format(newStart, 'EEE, MMM d')} with ${getFacilityName(conflicts[0].facility_id)}`);
    }
    updateShift({ ...shift, start_datetime: newStart.toISOString(), end_datetime: newEnd.toISOString() } as any);
    toast.success(`Shift moved to ${format(newStart, 'EEE, MMM d')}`);
    setDragOverDay(null);
  }, [shifts, updateShift, getFacilityName]);

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
    const otherShifts = shifts.filter(s => s.id !== shiftId);
    const conflicts = detectShiftConflicts(otherShifts, { start_datetime: newStart.toISOString(), end_datetime: newEnd.toISOString() });
    if (conflicts.length > 0) {
      toast.warning(`Scheduling conflict at ${format(newStart, 'h:mm a')} with ${getFacilityName(conflicts[0].facility_id)}`);
    }
    updateShift({ ...shift, start_datetime: newStart.toISOString(), end_datetime: newEnd.toISOString() } as any);
    toast.success(`Shift moved to ${format(newStart, 'EEE, MMM d h:mm a')}`);
  }, [shifts, updateShift, getFacilityName]);

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

  const openAddShiftAt = useCallback((date: Date, hour?: number) => {
    const startTime = hour !== undefined ? `${String(Math.floor(hour)).padStart(2, '0')}:${String(Math.round((hour % 1) * 60)).padStart(2, '0')}` : undefined;
    setAddShiftDefaults({ date, startTime });
    setShowAdd(true);
  }, []);

  const hasDoubleBooking = useCallback((dayShifts: any[]) => {
    for (let i = 0; i < dayShifts.length; i++) {
      for (let j = i + 1; j < dayShifts.length; j++) {
        const aStart = new Date(dayShifts[i].start_datetime).getTime();
        const aEnd = new Date(dayShifts[i].end_datetime).getTime();
        const bStart = new Date(dayShifts[j].start_datetime).getTime();
        const bEnd = new Date(dayShifts[j].end_datetime).getTime();
        if (aStart < bEnd && bStart < aEnd) return true;
      }
    }
    return false;
  }, []);

  const renderDayCell = (day: Date, minHeight: string) => {
    const dayShifts = calendarFilters.shifts ? shifts.filter(s => isSameDay(new Date(s.start_datetime), day)) : [];
    const dayBlocks = timeBlocks.filter(b => {
      const bs = new Date(b.start_datetime);
      const be = new Date(b.end_datetime);
      return day >= new Date(bs.getFullYear(), bs.getMonth(), bs.getDate()) && day <= new Date(be.getFullYear(), be.getMonth(), be.getDate());
    });
    const isToday = isSameDay(day, new Date());
    const markers = getMarkersForDay(day);
    const dayKey = day.toISOString();
    const isDragOver = dragOverDay === dayKey;
    const calEvents = getEventsForDay(day, { credentials: calendarFilters.credentials, subscriptions: calendarFilters.subscriptions });
    const isDoubleBooked = hasDoubleBooking(dayShifts);

    return (
      <div
        key={dayKey}
        className={`${minHeight} border-t border-r p-1 transition-colors cursor-pointer ${isToday ? 'bg-primary/5 border-l-2 border-l-primary' : ''} ${isDragOver ? 'bg-primary/10 ring-2 ring-inset ring-primary/30' : ''} ${isDoubleBooked ? 'ring-1 ring-inset ring-amber-500/40' : ''}`}
        onDragOver={(e) => onDragOver(e, dayKey)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, day)}
        onClick={() => openAddShiftAt(day)}
      >
        <div className={`text-xs font-medium mb-1 flex items-center gap-1 ${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
          {isToday ? <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[11px]">{format(day, 'd')}</span> : format(day, 'd')}
          {isDoubleBooked && (
            <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-600 dark:text-amber-400" title="Overlapping shifts">
              <AlertTriangle className="h-3 w-3" />
            </span>
          )}
        </div>
        {markers.map(m => (
          <div key={m.label} className={`text-[10px] px-1 py-0.5 rounded mb-0.5 truncate font-medium ${m.bg} ${m.text}`} title={m.label}>
            {m.type === 'tax' ? '💰' : '🔴'} {m.label}
          </div>
        ))}
        {dayBlocks.map(b => {
          const blockColor = BLOCK_COLORS.find(c => c.value === b.color) || BLOCK_COLORS[0];
          const blockTypeInfo = BLOCK_TYPES.find(t => t.value === b.block_type);
          return (
            <div
              key={b.id}
              className={`text-[10px] px-1 py-0.5 rounded mb-0.5 truncate font-medium ${blockColor.bg} ${blockColor.text} border border-dashed border-current/20`}
              onClick={(e) => { e.stopPropagation(); setEditBlock(b.id); }}
              title={`${b.title} (${blockTypeInfo?.label || 'Block'})`}
            >
              {blockTypeInfo?.icon || '🔒'} {b.title}
            </div>
          );
        })}
        {dayShifts.map(s => {
          const colorDef = SHIFT_COLORS.find(c => c.value === (s.color || 'blue')) || SHIFT_COLORS[0];
          const start = new Date(s.start_datetime);
          const end = new Date(s.end_datetime);
          const hrs = Math.max(0, differenceInHours(end, start));
          return (
            <div
              key={s.id}
              draggable
              onDragStart={(e) => onDragStart(e, s.id)}
              className={`text-[10px] p-1 rounded mb-0.5 cursor-grab active:cursor-grabbing ${colorDef.bg} ${colorDef.text} hover:opacity-80 transition-opacity select-none`}
              onClick={(e) => { e.stopPropagation(); setEditShift(s.id); }}
              title={`${getFacilityName(s.facility_id)} — drag to reschedule`}
            >
              <div className="font-semibold truncate leading-tight">{getFacilityName(s.facility_id)}</div>
              <div className="truncate opacity-80">{format(start, 'h:mma').toLowerCase()}–{format(end, 'h:mma').toLowerCase()}</div>
              <div className="truncate opacity-70">${s.rate_applied} · {hrs}h</div>
            </div>
          );
        })}
        <CalendarEventStack events={calEvents} maxVisible={2} />
      </div>
    );
  };

  const isCalendarView = view === 'month' || view === 'week' || view === 'list';

  return (
    <div>
      <div className="page-header flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-3">
          <h1 className="page-title">Schedule</h1>
          {isCalendarView && (
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => setShowAdd(true)} className="h-8 text-[12px] sm:text-[13px] px-3 sm:px-4">
                <Plus className="mr-1 sm:mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Add Shift
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setBlockTimeDefaultDate(undefined); setShowBlockTime(true); }} className="h-8 text-[12px] sm:text-[13px] px-3 sm:px-4">
                <Ban className="mr-1 sm:mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Block Time
              </Button>
            </div>
          )}
        </div>
        <div className="flex gap-1.5 sm:gap-2 flex-wrap">
          <Button size="sm" variant={view === 'month' ? 'default' : 'outline'} onClick={() => setView('month')} className="h-8 text-[12px] sm:text-[13px] px-2.5 sm:px-4">
            <CalendarDays className="mr-1 sm:mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Month
          </Button>
          <Button size="sm" variant={view === 'week' ? 'default' : 'outline'} onClick={() => setView('week')} className="h-8 text-[12px] sm:text-[13px] px-2.5 sm:px-4">
            <CalendarIcon className="mr-1 sm:mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Week
          </Button>
          <Button size="sm" variant={view === 'list' ? 'default' : 'outline'} onClick={() => setView('list')} className="h-8 text-[12px] sm:text-[13px] px-2.5 sm:px-4">
            <List className="mr-1 sm:mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" /> List
          </Button>
          <Button size="sm" variant={view === 'confirmations' ? 'default' : 'outline'} onClick={() => setView('confirmations')} className="h-8 text-[12px] sm:text-[13px] px-2.5 sm:px-4">
            <CheckSquare className="mr-1 sm:mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Clinic </span>Confirm
          </Button>
          <Button size="sm" variant={view === 'sync' ? 'default' : 'outline'} onClick={() => setView('sync')} className="h-8 text-[12px] sm:text-[13px] px-2.5 sm:px-4">
            <RefreshCw className="mr-1 sm:mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Sync
          </Button>
        </div>
      </div>

      {view === 'sync' ? (
        <CalendarSyncPanel />
      ) : view === 'confirmations' ? (
        <ClinicConfirmationsTab />
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={navigateBack}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">{headerLabel}</h2>
              <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setCurrentDate(new Date())}>
                Today
              </Button>
            </div>
            <Button variant="ghost" size="icon" onClick={navigateForward}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {totalShiftsInRange > 0 && (
            <div className="flex items-center gap-4 mb-4 px-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> <span className="font-medium text-foreground">{totalShiftsInRange}</span> shifts</span>
              <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> <span className="font-medium text-foreground">{totalHoursInRange}</span> hours</span>
              <span className="flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" /> <span className="font-medium text-foreground">${totalRevenueInRange.toLocaleString()}</span> expected</span>
            </div>
          )}

          <div className="mb-4">
            <CalendarFilters filters={calendarFilters} onToggle={toggleFilter} />
          </div>

          {view === 'month' ? (
            <>
              <div className="rounded-lg border bg-card overflow-x-auto">
                <div className="min-w-[500px]">
                  <div className="grid grid-cols-7 bg-muted/50">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                      <div key={d} className="p-1.5 sm:p-2 text-center text-[10px] sm:text-xs font-medium text-muted-foreground">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7">
                    {Array.from({ length: startDow }).map((_, i) => (
                      <div key={`empty-${i}`} className="min-h-[60px] sm:min-h-[80px] border-t border-r bg-muted/20" />
                    ))}
                    {monthDays.map(day => renderDayCell(day, 'min-h-[60px] sm:min-h-[80px]'))}
                  </div>
                </div>
              </div>
              {totalShiftsInRange === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <CalendarPlus className="h-12 w-12 text-muted-foreground/40 mb-4" />
                  <h3 className="text-lg font-semibold mb-1">No shifts this month</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mb-4">Add shifts to track your schedule, auto-generate invoices, and sync to your calendar.</p>
                  <Button onClick={() => setShowAdd(true)}><Plus className="mr-1.5 h-4 w-4" /> Add Your First Shift</Button>
                </div>
              )}
            </>
          ) : view === 'week' ? (
            <>
              <WeekTimeGrid
                weekDays={weekDays}
                shifts={calendarFilters.shifts ? shifts : []}
                getFacilityName={getFacilityName}
                onEditShift={setEditShift}
                onDropOnTime={handleDropOnTime}
                onCellClick={openAddShiftAt}
                calendarFilters={{ credentials: calendarFilters.credentials, subscriptions: calendarFilters.subscriptions }}
                getEventsForDay={getEventsForDay}
                timeBlocks={timeBlocks}
                onEditBlock={setEditBlock}
              />
              {totalShiftsInRange === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <CalendarPlus className="h-12 w-12 text-muted-foreground/40 mb-4" />
                  <h3 className="text-lg font-semibold mb-1">No shifts this week</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mb-4">Add shifts to track your schedule, auto-generate invoices, and sync to your calendar.</p>
                  <Button onClick={() => setShowAdd(true)}><Plus className="mr-1.5 h-4 w-4" /> Add Your First Shift</Button>
                </div>
              )}
            </>
          ) : (
            <TooltipProvider>
            <div className="rounded-lg border bg-card overflow-x-auto -mx-3 sm:mx-0">
              <table className="w-full text-sm min-w-[500px] sm:min-w-0">
                <thead><tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Facility</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Time</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Hours</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Earnings</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="w-10" />
                </tr></thead>
                <tbody>
                  {rangeShifts.map(s => {
                    const hrs = Math.max(0, differenceInHours(new Date(s.end_datetime), new Date(s.start_datetime)));
                    const isPaid = paidShiftIds.has(s.id);
                    return (
                      <React.Fragment key={s.id}>
                        <tr className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => setEditShift(s.id)}>
                          <td className="p-3">{format(new Date(s.start_datetime), 'EEE, MMM d')}</td>
                          <td className="p-3 font-medium">{getFacilityName(s.facility_id)}</td>
                          <td className="p-3 text-muted-foreground hidden md:table-cell">{format(new Date(s.start_datetime), 'h:mm a')} – {format(new Date(s.end_datetime), 'h:mm a')}</td>
                          <td className="p-3 text-muted-foreground hidden md:table-cell">{hrs}h</td>
                          <td className="p-3 font-medium">${s.rate_applied}</td>
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
                        {isPaid && (s.rate_applied || 0) > 0 && (
                          <tr className="border-b last:border-0">
                            <td colSpan={7} className="px-3 pb-2 pt-0">
                              <ShiftTaxNudge
                                shiftIncome={s.rate_applied || 0}
                                taxProfile={taxProfile}
                                hasProfile={hasTaxProfile}
                                isPaid={isPaid}
                                effectiveRate={effectiveRate}
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {rangeShifts.length === 0 && (
                    <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">
                      <div className="flex flex-col items-center py-8">
                        <CalendarPlus className="h-10 w-10 text-muted-foreground/40 mb-3" />
                        <p className="mb-3">No shifts to display</p>
                        <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="mr-1.5 h-3.5 w-3.5" /> Add Shift</Button>
                      </div>
                    </td></tr>
                  )}
                </tbody>
                {rangeShifts.length > 0 && (
                  <tfoot>
                    <tr className="border-t bg-muted/30 font-medium text-sm">
                      <td className="p-3">{totalShiftsInRange} shifts</td>
                      <td className="p-3" />
                      <td className="p-3 hidden md:table-cell" />
                      <td className="p-3 hidden md:table-cell">{totalHoursInRange}h</td>
                      <td className="p-3">${totalRevenueInRange.toLocaleString()}</td>
                      <td className="p-3" />
                      <td />
                    </tr>
                    {ytdPaidIncome > 0 && (
                      <tr className="border-t">
                        <td colSpan={7}>
                          <ShiftTaxSummaryFooter ytdPaid={ytdPaidIncome} effectiveRate={effectiveRate} hasProfile={hasTaxProfile} />
                        </td>
                      </tr>
                    )}
                  </tfoot>
                )}
              </table>
            </div>
            </TooltipProvider>
          )}
        </>
      )}

      <ShiftFormDialog
        open={showAdd}
        onOpenChange={(o) => { setShowAdd(o); if (!o) setAddShiftDefaults({}); }}
        facilities={facilities}
        shifts={shifts}
        terms={terms}
        onSave={handleSaveShift}
        defaultDate={addShiftDefaults.date}
        defaultStartTime={addShiftDefaults.startTime}
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

      <BlockTimeDialog
        open={showBlockTime}
        onOpenChange={setShowBlockTime}
        onSave={async (b) => { await addTimeBlock(b as Omit<TimeBlock, 'id'>); toast.success('Time blocked'); }}
        defaultDate={blockTimeDefaultDate}
      />

      {editBlock && (
        <BlockTimeDialog
          key={editBlock}
          open={!!editBlock}
          onOpenChange={() => setEditBlock(null)}
          existing={timeBlocks.find(b => b.id === editBlock)}
          onSave={async (b) => { await updateTimeBlock(b as TimeBlock); toast.success('Time block updated'); }}
          onDelete={async (id) => { await deleteTimeBlock(id); setEditBlock(null); toast.success('Time block deleted'); }}
        />
      )}
    </div>
  );
}
