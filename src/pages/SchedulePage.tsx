import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/StatusBadge';
import { Plus, ChevronLeft, ChevronRight, List, CalendarDays, AlertTriangle, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay } from 'date-fns';
import { ShiftStatus } from '@/types';
import { detectShiftConflicts } from '@/lib/businessLogic';
import { toast } from 'sonner';

export default function SchedulePage() {
  const { shifts, clinics, addShift, updateShift, deleteShift } = useData();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [showAdd, setShowAdd] = useState(false);
  const [editShift, setEditShift] = useState<string | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDow = getDay(monthStart);

  const monthShifts = shifts.filter(s => {
    const d = new Date(s.start_datetime);
    return d >= monthStart && d <= monthEnd;
  }).sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());

  const getClinicName = (id: string) => clinics.find(c => c.id === id)?.name || 'Unknown';

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Schedule</h1>
        <div className="flex gap-2">
          <Button size="sm" variant={view === 'calendar' ? 'default' : 'outline'} onClick={() => setView('calendar')}>
            <CalendarDays className="mr-1 h-4 w-4" /> Calendar
          </Button>
          <Button size="sm" variant={view === 'list' ? 'default' : 'outline'} onClick={() => setView('list')}>
            <List className="mr-1 h-4 w-4" /> List
          </Button>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="mr-1 h-4 w-4" /> Add Shift
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">{format(currentMonth, 'MMMM yyyy')}</h2>
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {view === 'calendar' ? (
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
            {days.map(day => {
              const dayShifts = shifts.filter(s => isSameDay(new Date(s.start_datetime), day));
              const isToday = isSameDay(day, new Date());
              return (
                <div key={day.toISOString()} className={`min-h-[80px] border-t border-r p-1 ${isToday ? 'bg-primary/5' : ''}`}>
                  <div className={`text-xs font-medium mb-1 ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                    {format(day, 'd')}
                  </div>
                  {dayShifts.map(s => (
                    <div
                      key={s.id}
                      className="text-xs p-1 rounded mb-0.5 cursor-pointer truncate bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      onClick={() => setEditShift(s.id)}
                      title={getClinicName(s.clinic_id)}
                    >
                      {format(new Date(s.start_datetime), 'ha')} {getClinicName(s.clinic_id).split(' ')[0]}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Clinic</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Time</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Rate</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
              <th className="w-10" />
            </tr></thead>
            <tbody>
              {monthShifts.map(s => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => setEditShift(s.id)}>
                  <td className="p-3">{format(new Date(s.start_datetime), 'EEE, MMM d')}</td>
                  <td className="p-3 font-medium">{getClinicName(s.clinic_id)}</td>
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
                          <AlertDialogDescription>{getClinicName(s.clinic_id)} — {format(new Date(s.start_datetime), 'MMM d, yyyy')}</AlertDialogDescription>
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
              {monthShifts.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No shifts this month</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <ShiftFormDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        clinics={clinics}
        shifts={shifts}
        onSave={(s) => { addShift(s); toast.success('Shift added'); }}
      />

      {editShift && (
        <ShiftFormDialog
          open={!!editShift}
          onOpenChange={() => setEditShift(null)}
          clinics={clinics}
          shifts={shifts}
          existing={shifts.find(s => s.id === editShift)}
          onSave={(s) => { updateShift(s as any); toast.success('Shift updated'); }}
          onDelete={(id) => { deleteShift(id); setEditShift(null); toast.success('Shift deleted'); }}
        />
      )}
    </div>
  );
}

function ShiftFormDialog({ open, onOpenChange, clinics, shifts, existing, onSave, onDelete }: {
  open: boolean; onOpenChange: (o: boolean) => void;
  clinics: any[]; shifts: any[]; existing?: any;
  onSave: (s: any) => void;
  onDelete?: (id: string) => void;
}) {
  const [clinicId, setClinicId] = useState(existing?.clinic_id || clinics[0]?.id || '');
  const [date, setDate] = useState(existing ? format(new Date(existing.start_datetime), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState(existing ? format(new Date(existing.start_datetime), 'HH:mm') : '08:00');
  const [endTime, setEndTime] = useState(existing ? format(new Date(existing.end_datetime), 'HH:mm') : '18:00');
  const [status, setStatus] = useState<ShiftStatus>(existing?.status || 'proposed');
  const [rate, setRate] = useState(existing?.rate_applied?.toString() || '850');
  const [notes, setNotes] = useState(existing?.notes || '');

  const startDt = `${date}T${startTime}:00`;
  const endDt = `${date}T${endTime}:00`;

  const conflicts = useMemo(() =>
    detectShiftConflicts(shifts, { start_datetime: startDt, end_datetime: endDt, id: existing?.id }),
    [shifts, startDt, endDt, existing?.id]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const shift = {
      ...(existing || {}),
      clinic_id: clinicId,
      start_datetime: new Date(startDt).toISOString(),
      end_datetime: new Date(endDt).toISOString(),
      status,
      rate_applied: Number(rate),
      notes,
    };
    onSave(shift);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{existing ? 'Edit Shift' : 'Add Shift'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>Clinic</Label>
            <Select value={clinicId} onValueChange={setClinicId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {clinics.filter(c => c.status === 'active').map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Date</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Start</Label><Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} /></div>
            <div><Label>End</Label><Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Status</Label>
              <Select value={status} onValueChange={v => setStatus(v as ShiftStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="proposed">Proposed</SelectItem>
                  <SelectItem value="booked">Booked</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Rate ($)</Label><Input type="number" value={rate} onChange={e => setRate(e.target.value)} /></div>
          </div>
          <div><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></div>

          {conflicts.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Scheduling conflict!</p>
                {conflicts.map(c => (
                  <p key={c.id} className="text-xs">
                    {clinics.find(cl => cl.id === c.clinic_id)?.name}: {format(new Date(c.start_datetime), 'MMM d, h:mm a')} - {format(new Date(c.end_datetime), 'h:mm a')}
                  </p>
                ))}
              </div>
            </div>
          )}

          <Button type="submit" className="w-full">{existing ? 'Update Shift' : 'Add Shift'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
