import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertTriangle, Trash2, CalendarDays, DollarSign } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { ShiftStatus, SHIFT_COLORS, ShiftColor, TermsSnapshot } from '@/types';
import { detectShiftConflicts } from '@/lib/businessLogic';
import { cn } from '@/lib/utils';
import { termsToRates, RateEntry } from '@/components/facilities/RatesEditor';

interface ShiftFormDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  facilities: any[];
  shifts: any[];
  terms: TermsSnapshot[];
  existing?: any;
  onSave: (s: any) => void;
  onDelete?: (id: string) => void;
  embedded?: boolean;
  defaultDate?: Date;
  defaultStartTime?: string;
}

function buildRateOptions(terms: TermsSnapshot[], facilityId: string): RateEntry[] {
  const facilityTerms = terms.find(t => t.facility_id === facilityId);
  if (!facilityTerms) return [];
  return termsToRates(facilityTerms).filter(r => r.amount > 0);
}

export function ShiftFormDialog({ open, onOpenChange, facilities, shifts, terms, existing, onSave, onDelete, embedded, defaultDate, defaultStartTime }: ShiftFormDialogProps) {
  const [facilityId, setFacilityId] = useState(existing?.facility_id || facilities[0]?.id || '');
  const [selectedDates, setSelectedDates] = useState<Date[]>(
    existing ? [new Date(existing.start_datetime)] : defaultDate ? [defaultDate] : []
  );
  const [startTime, setStartTime] = useState(existing ? format(new Date(existing.start_datetime), 'HH:mm') : defaultStartTime || '08:00');
  const [endTime, setEndTime] = useState(existing ? format(new Date(existing.end_datetime), 'HH:mm') : defaultStartTime ? format(new Date(2026, 0, 1, parseInt(defaultStartTime.split(':')[0]) + 1, parseInt(defaultStartTime.split(':')[1] || '0')), 'HH:mm') : '18:00');
  const [status, setStatus] = useState<ShiftStatus>(existing?.status || 'proposed');
  const [rate, setRate] = useState(existing?.rate_applied?.toString() || '');
  const [notes, setNotes] = useState(existing?.notes || '');
  const [color, setColor] = useState<ShiftColor>(existing?.color || 'blue');

  const isMultiMode = !existing;

  const rateOptions = useMemo(() => buildRateOptions(terms, facilityId), [terms, facilityId]);

  // When facility changes in create mode, reset rate if current rate doesn't match new facility's options
  const handleFacilityChange = (newFacilityId: string) => {
    setFacilityId(newFacilityId);
    const newOptions = buildRateOptions(terms, newFacilityId);
    if (newOptions.length > 0 && !newOptions.some(o => o.amount.toString() === rate)) {
      setRate(newOptions[0].amount.toString());
    }
  };

  // For conflict detection
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

  const formContent = (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>Facility</Label>
            <Select value={facilityId} onValueChange={handleFacilityChange}>
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
            <div>
              <Label>Rate ($)</Label>
              {rateOptions.length > 0 ? (
                <div className="space-y-1.5">
                  <Select
                    value={rateOptions.some(o => o.amount.toString() === rate) ? rate : 'custom'}
                    onValueChange={(v) => {
                      if (v !== 'custom') setRate(v);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select rate" />
                    </SelectTrigger>
                    <SelectContent>
                      {rateOptions.map((opt, i) => (
                        <SelectItem key={`${opt.type}-${i}`} value={opt.amount.toString()}>
                          {opt.label} — ${opt.amount.toLocaleString()}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">Custom amount</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="number"
                      value={rate}
                      onChange={e => setRate(e.target.value)}
                      className="pl-7"
                      min={0}
                      placeholder="0"
                    />
                  </div>
                </div>
              ) : (
                <Input type="number" value={rate} onChange={e => setRate(e.target.value)} placeholder="0" min={0} />
              )}
            </div>
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
  );

  if (embedded) return formContent;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{existing ? 'Edit Shift' : 'Add Shift'}</DialogTitle></DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
