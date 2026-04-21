import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { TimeBlock, BLOCK_TYPES, BLOCK_COLORS, BlockType } from '@/types';
import { useData } from '@/contexts/DataContext';

const BOOKED_CLASS = "bg-red-100 text-red-700 font-semibold hover:bg-red-200 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-900/50 aria-selected:!bg-primary aria-selected:!text-primary-foreground";

interface BlockTimeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (block: Omit<TimeBlock, 'id'> | TimeBlock) => void;
  onDelete?: (id: string) => void;
  existing?: TimeBlock;
  defaultDate?: Date;
}

export function BlockTimeDialog({ open, onOpenChange, onSave, onDelete, existing, defaultDate }: BlockTimeDialogProps) {
  const { shifts } = useData();
  const [title, setTitle] = useState('');
  const [blockType, setBlockType] = useState<BlockType>('vacation');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [notes, setNotes] = useState('');
  const [color, setColor] = useState('gray');

  const bookedDateObjects = useMemo(() => {
    const seen = new Map<string, Date>();
    for (const s of shifts || []) {
      const d = new Date(s.date);
      if (isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!seen.has(key)) seen.set(key, new Date(d.getFullYear(), d.getMonth(), d.getDate()));
    }
    return Array.from(seen.values());
  }, [shifts]);

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setBlockType(existing.block_type);
      setStartDate(new Date(existing.start_datetime));
      setEndDate(new Date(existing.end_datetime));
      setAllDay(existing.all_day);
      setStartTime(format(new Date(existing.start_datetime), 'HH:mm'));
      setEndTime(format(new Date(existing.end_datetime), 'HH:mm'));
      setNotes(existing.notes);
      setColor(existing.color);
    } else {
      const d = defaultDate || new Date();
      setTitle('');
      setBlockType('vacation');
      setStartDate(d);
      setEndDate(d);
      setAllDay(true);
      setStartTime('09:00');
      setEndTime('17:00');
      setNotes('');
      setColor('gray');
    }
  }, [existing, defaultDate, open]);

  const handleSave = () => {
    if (!title.trim()) return;
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (allDay) {
      s.setHours(0, 0, 0, 0);
      e.setHours(23, 59, 59, 999);
    } else {
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      s.setHours(sh, sm, 0, 0);
      e.setHours(eh, em, 0, 0);
    }
    const block = {
      ...(existing ? { id: existing.id } : {}),
      title: title.trim(),
      block_type: blockType,
      start_datetime: s.toISOString(),
      end_datetime: e.toISOString(),
      all_day: allDay,
      notes,
      color,
    };
    onSave(block as any);
    onOpenChange(false);
  };

  const typeInfo = BLOCK_TYPES.find(t => t.value === blockType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{existing ? 'Edit Time Block' : 'Block Time'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input placeholder="e.g. Spring Break" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={blockType} onValueChange={v => setBlockType(v as BlockType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BLOCK_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={allDay} onCheckedChange={setAllDay} id="all-day" />
            <Label htmlFor="all-day">All day</Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(startDate, 'MMM d, yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={d => { if (d) { setStartDate(d); if (d > endDate) setEndDate(d); } }} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(endDate, 'MMM d, yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={endDate} onSelect={d => { if (d) setEndDate(d); }} disabled={d => d < startDate} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {!allDay && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Start Time</Label>
                <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>End Time</Label>
                <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex gap-2">
              {BLOCK_COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={cn(
                    'h-7 w-7 rounded-full border-2 transition-all',
                    c.bg,
                    color === c.value ? 'border-foreground scale-110' : 'border-transparent'
                  )}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea placeholder="Any details..." value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          {existing && onDelete && (
            <Button variant="destructive" size="sm" onClick={() => { onDelete(existing.id); onOpenChange(false); }}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!title.trim()}>
              {existing ? 'Update' : 'Block Time'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
