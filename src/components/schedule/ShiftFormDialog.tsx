import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertTriangle, Trash2, CalendarDays } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { ShiftStatus, SHIFT_COLORS, ShiftColor } from '@/types';
import { detectShiftConflicts } from '@/lib/businessLogic';
import { cn } from '@/lib/utils';

interface ShiftFormDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  facilities: any[];
  shifts: any[];
  existing?: any;
  onSave: (s: any) => void;
  onDelete?: (id: string) => void;
}

export function ShiftFormDialog({ open, onOpenChange, facilities, shifts, existing, onSave, onDelete }: ShiftFormDialogProps) {
  const [facilityId, setFacilityId] = useState(existing?.facility_id || facilities[0]?.id || '');
  const [selectedDates, setSelectedDates] = useState<Date[]>(
    existing ? [new Date(existing.start_datetime)] : []
  );
  const [startTime, setStartTime] = useState(existing ? format(new Date(existing.start_datetime), 'HH:mm') : '08:00');
  const [endTime, setEndTime] = useState(existing ? format(new Date(existing.end_datetime), 'HH:mm') : '18:00');
  const [status, setStatus] = useState<ShiftStatus>(existing?.status || 'proposed');
  const [rate, setRate] = useState(existing?.rate_applied?.toString() || '850');
  const [notes, setNotes] = useState(existing?.notes || '');
  const [color, setColor] = useState<ShiftColor>(existing?.color || 'blue');

  const isMultiMode = !existing;

  // For conflict detection, check the first selected date
  const firstDate = selectedDates[0] ? format(selectedDates[0], 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
  const startDt = `${firstDate}T${startTime}:00`;
  const endDt = `${firstDate}T${endTime}:00`;

  const conflicts = useMemo(() =>
    detectShiftConflicts(shifts, { start_datetime: startDt, end_datetime: endDt, id: existing?.id }),
    [shifts, startDt, endDt, existing?.id]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (existing) {
      // Edit mode — single date
      const date = format(selectedDates[0] || new Date(), 'yyyy-MM-dd');
      const shift = {
        ...existing,
        facility_id: facilityId,
        start_datetime: new Date(`${date}T${startTime}:00`).toISOString(),
        end_datetime: new Date(`${date}T${endTime}:00`).toISOString(),
        status,
        rate_applied: Number(rate),
        notes,
        color,
      };
      onSave(shift);
    } else {
      // Create mode — multiple dates
      for (const d of selectedDates) {
        const date = format(d, 'yyyy-MM-dd');
        const shift = {
          facility_id: facilityId,
          start_datetime: new Date(`${date}T${startTime}:00`).toISOString(),
          end_datetime: new Date(`${date}T${endTime}:00`).toISOString(),
          status,
          rate_applied: Number(rate),
          notes,
          color,
        };
        onSave(shift);
      }
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{existing ? 'Edit Shift' : 'Add Shift'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>Facility</Label>
            <Select value={facilityId} onValueChange={setFacilityId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {facilities.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date selection */}
          <div>
            <Label>{isMultiMode ? 'Dates (select one or more)' : 'Date'}</Label>
            {isMultiMode && <p className="text-xs text-muted-foreground">Choose one or more dates for this shift.</p>}
            {isMultiMode ? (
              <div className="mt-1.5">
                <div className="border rounded-lg p-2 inline-block">
                  <Calendar
                    mode="multiple"
                    selected={selectedDates}
                    onSelect={(dates) => setSelectedDates(dates || [])}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </div>
                {selectedDates.length > 0 ? (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {selectedDates.length} date{selectedDates.length !== 1 ? 's' : ''} selected: {selectedDates.sort((a, b) => a.getTime() - b.getTime()).map(d => format(d, 'MMM d')).join(', ')}
                  </p>
                ) : (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">Select at least one date.</p>
                )}
              </div>
            ) : (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !selectedDates[0] && "text-muted-foreground")}>
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {selectedDates[0] ? format(selectedDates[0], 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDates[0]}
                    onSelect={(date) => date && setSelectedDates([date])}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>

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
          <div>
            <Label>Color</Label>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              {SHIFT_COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${c.bg} ${color === c.value ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'}`}
                  title={c.label}
                >
                  <span className={`block w-full h-full rounded-full ${c.value === 'blue' ? 'bg-blue-500' : c.value === 'green' ? 'bg-green-500' : c.value === 'red' ? 'bg-red-500' : c.value === 'orange' ? 'bg-orange-500' : c.value === 'purple' ? 'bg-purple-500' : c.value === 'pink' ? 'bg-pink-500' : c.value === 'teal' ? 'bg-teal-500' : 'bg-yellow-500'}`} />
                </button>
              ))}
            </div>
          </div>

          {conflicts.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Scheduling conflict!</p>
                {conflicts.map(c => (
                  <p key={c.id} className="text-xs">
                    {facilities.find((cl: any) => cl.id === c.facility_id)?.name}: {format(new Date(c.start_datetime), 'MMM d, h:mm a')} - {format(new Date(c.end_datetime), 'h:mm a')}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={selectedDates.length === 0}>
              {existing ? 'Update Shift' : selectedDates.length > 1 ? `Add ${selectedDates.length} Shifts` : 'Add Shift'}
            </Button>
            {existing && onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this shift?</AlertDialogTitle>
                    <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(existing.id)}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
