import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertTriangle, Trash2, CalendarDays, DollarSign, Clock, Building2, StickyNote, Palette } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { ShiftStatus, SHIFT_COLORS, ShiftColor, TermsSnapshot, Shift } from '@/types';
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
   onSave: (s: any) => void | Promise<void>;
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

const COLOR_MAP: Record<ShiftColor, string> = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
  teal: 'bg-teal-500',
  yellow: 'bg-yellow-500',
};

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
  const [showNotes, setShowNotes] = useState(!!existing?.notes);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isMultiMode = !existing;

  const rateOptions = useMemo(() => buildRateOptions(terms, facilityId), [terms, facilityId]);

  const bookedDates = useMemo(() => new Set(
    shifts
      .filter(s => s.status === 'booked' || s.status === 'proposed')
      .map(s => format(new Date(s.start_datetime), 'yyyy-MM-dd'))
  ), [shifts]);

  const handleFacilityChange = (newFacilityId: string) => {
    setFacilityId(newFacilityId);
    const newOptions = buildRateOptions(terms, newFacilityId);
    if (newOptions.length > 0 && !newOptions.some(o => o.amount.toString() === rate)) {
      setRate(newOptions[0].amount.toString());
    }
  };

  // Check conflicts for ALL selected dates, not just the first
  const conflicts = useMemo(() => {
    const allConflicts: Shift[] = [];
    const seen = new Set<string>();
    const datesToCheck = selectedDates.length > 0 ? selectedDates : [new Date()];
    for (const d of datesToCheck) {
      const dateStr = format(d, 'yyyy-MM-dd');
      const startDt = `${dateStr}T${startTime}:00`;
      const endDt = `${dateStr}T${endTime}:00`;
      // Filter out canceled/completed shifts before checking
      const activeShifts = shifts.filter(s => s.status !== 'canceled');
      for (const c of detectShiftConflicts(activeShifts, { start_datetime: startDt, end_datetime: endDt, id: existing?.id })) {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          allConflicts.push(c);
        }
      }
    }
    return allConflicts;
  }, [shifts, selectedDates, startTime, endTime, existing?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (existing) {
        const date = format(selectedDates[0] || new Date(), 'yyyy-MM-dd');
        await onSave({
          ...existing,
          facility_id: facilityId,
          start_datetime: new Date(`${date}T${startTime}:00`).toISOString(),
          end_datetime: new Date(`${date}T${endTime}:00`).toISOString(),
          status, rate_applied: Number(rate), notes, color,
        });
      } else {
        const orderedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
        for (const d of orderedDates) {
          const date = format(d, 'yyyy-MM-dd');
          await onSave({
            facility_id: facilityId,
            start_datetime: new Date(`${date}T${startTime}:00`).toISOString(),
            end_datetime: new Date(`${date}T${endTime}:00`).toISOString(),
            status, rate_applied: Number(rate), notes, color,
          });
        }
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save shift(s):', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Two-column layout: left = calendar, right = details */}
      <div className="flex flex-col sm:flex-row gap-6">
        {/* Left column: Date picker */}
        <div className="sm:w-[280px] shrink-0 flex flex-col">
          <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            {isMultiMode ? 'Select Dates' : 'Date'}
          </Label>
          {isMultiMode ? (
            <div className="flex-1 flex flex-col">
              <div className="border border-border rounded-xl overflow-hidden">
                <Calendar
                  mode="multiple"
                  selected={selectedDates}
                  onSelect={(dates) => setSelectedDates(dates || [])}
                  modifiers={{ booked: (date: Date) => bookedDates.has(format(date, 'yyyy-MM-dd')) }}
                  modifiersClassNames={{ booked: "bg-destructive/20 text-destructive font-semibold" }}
                  className={cn("p-2 pointer-events-auto")}
                />
              </div>
              {selectedDates.length > 0 ? (
                <p className="text-xs text-muted-foreground mt-2">
                  {selectedDates.length} date{selectedDates.length !== 1 ? 's' : ''}: {selectedDates.sort((a, b) => a.getTime() - b.getTime()).map(d => format(d, 'MMM d')).join(', ')}
                </p>
              ) : (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">Tap to select dates</p>
              )}
            </div>
          ) : (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-10", !selectedDates[0] && "text-muted-foreground")}>
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

        {/* Right column: Shift details */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Facility */}
          <div>
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Facility
            </Label>
            <Select value={facilityId} onValueChange={handleFacilityChange}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {facilities.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time row */}
          <div>
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Time
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="h-10" />
              <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="h-10" />
            </div>
          </div>

          {/* Status + Rate row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Status</Label>
              <Select value={status} onValueChange={v => setStatus(v as ShiftStatus)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="proposed">Proposed</SelectItem>
                  <SelectItem value="booked">Booked</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" />
                Rate
              </Label>
              {rateOptions.length > 0 ? (
                <Select
                  value={rateOptions.some(o => o.amount.toString() === rate) ? rate : 'custom'}
                  onValueChange={(v) => { if (v !== 'custom') setRate(v); }}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select rate" />
                  </SelectTrigger>
                  <SelectContent>
                    {rateOptions.map((opt, i) => (
                      <SelectItem key={`${opt.type}-${i}`} value={opt.amount.toString()}>
                        {opt.label} — ${opt.amount.toLocaleString()}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input type="number" value={rate} onChange={e => setRate(e.target.value)} placeholder="0" min={0} className="pl-7 h-10" />
                </div>
              )}
            </div>
          </div>

          {/* Color row */}
          <div>
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5" />
              Color
            </Label>
            <div className="flex items-center gap-2">
              <div className="flex gap-2 flex-wrap">
                {SHIFT_COLORS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={cn(
                      "w-7 h-7 rounded-full transition-all",
                      COLOR_MAP[c.value],
                      color === c.value ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110' : 'opacity-50 hover:opacity-90 hover:scale-105'
                    )}
                    title={c.label}
                  />
                ))}
              </div>
              {!showNotes && (
                <Button type="button" variant="ghost" size="sm" className="text-xs text-muted-foreground shrink-0 h-7 px-2 ml-auto" onClick={() => setShowNotes(true)}>
                  <StickyNote className="h-3.5 w-3.5 mr-1" />
                  Add note
                </Button>
              )}
            </div>
          </div>

          {/* Notes (collapsible) */}
          {showNotes && (
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Shift notes..." className="resize-none text-sm" />
          )}
        </div>
      </div>

      {/* Conflict warning */}
      {conflicts.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-xs">Scheduling conflict!</p>
            {conflicts.map(c => (
              <p key={c.id} className="text-xs">
                {facilities.find((cl: any) => cl.id === c.facility_id)?.name}: {format(new Date(c.start_datetime), 'MMM d, h:mm a')} – {format(new Date(c.end_datetime), 'h:mm a')}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button type="submit" className="flex-1 h-11" disabled={selectedDates.length === 0}>
          {isSubmitting ? 'Saving...' : existing ? 'Update Shift' : selectedDates.length > 1 ? `Add ${selectedDates.length} Shifts` : 'Add Shift'}
        </Button>
        {existing && onDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive" size="icon" className="h-11 w-11"><Trash2 className="h-4 w-4" /></Button>
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
      <DialogContent className="max-w-[680px] overflow-hidden">
        <DialogHeader><DialogTitle>{existing ? 'Edit Shift' : 'Add Shift'}</DialogTitle></DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}