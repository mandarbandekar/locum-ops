import { useState, useEffect, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Clock, Minus, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export interface TimePickerProps {
  value: string; // 'HH:mm' (24h) or '' if unset
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
  /** Optional label shown inside popover/sheet header */
  label?: string;
}

const COMMON_TIMES_24H = ['06:00', '08:00', '12:00', '14:00', '18:00', '22:00'];

function to12h(value: string): { hour: number; minute: number; period: 'AM' | 'PM' } | null {
  if (!value) return null;
  const [hStr, mStr] = value.split(':');
  const h24 = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h24) || isNaN(m)) return null;
  const period: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM';
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return { hour: h12, minute: m, period };
}

function to24h(hour: number, minute: number, period: 'AM' | 'PM'): string {
  let h = hour % 12;
  if (period === 'PM') h += 12;
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function formatTimeLabel(value: string): string {
  const parts = to12h(value);
  if (!parts) return '';
  return `${parts.hour}:${String(parts.minute).padStart(2, '0')} ${parts.period}`;
}

interface PanelProps {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  onClose: () => void;
  showDoneButton?: boolean;
}

function TimePickerPanel({ value, onChange, label, onClose, showDoneButton }: PanelProps) {
  const initial = useMemo(() => to12h(value) || { hour: 8, minute: 0, period: 'AM' as const }, [value]);
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const [period, setPeriod] = useState<'AM' | 'PM'>(initial.period);

  useEffect(() => {
    const next = to12h(value);
    if (next) {
      setHour(next.hour);
      setMinute(next.minute);
      setPeriod(next.period);
    }
  }, [value]);

  // Live commit on every change so closing (outside click) preserves the selection.
  useEffect(() => {
    const next = to24h(hour, minute, period);
    if (next !== value) onChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hour, minute, period]);

  const bumpHour = (delta: number) => {
    setHour(h => {
      const n = h + delta;
      if (n > 12) return 1;
      if (n < 1) return 12;
      return n;
    });
  };

  const bumpMinute = (delta: number) => {
    setMinute(m => {
      const n = m + delta * 15;
      if (n >= 60) return 0;
      if (n < 0) return 45;
      return n;
    });
  };

  const commitChip = (preset: string) => {
    const p = to12h(preset);
    if (!p) return;
    setHour(p.hour);
    setMinute(p.minute);
    setPeriod(p.period);
    onChange(preset);
    onClose();
  };

  const display = `${hour}:${String(minute).padStart(2, '0')}`;

  return (
    <div className="space-y-4">
      {label && (
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
      )}

      {/* Big readout */}
      <div className="text-center">
        <div className="inline-flex items-baseline gap-2">
          <span className="text-4xl font-semibold tabular-nums text-foreground">{display}</span>
          <button
            type="button"
            onClick={() => setPeriod(p => (p === 'AM' ? 'PM' : 'AM'))}
            className="text-lg font-medium text-primary hover:underline"
            aria-label="Toggle AM/PM"
          >
            {period}
          </button>
        </div>
      </div>

      {/* Common time chips */}
      <div className="flex flex-wrap justify-center gap-1.5">
        {COMMON_TIMES_24H.map(p => {
          const isActive = value === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => commitChip(p)}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                isActive
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background hover:bg-accent hover:text-accent-foreground',
              )}
            >
              {formatTimeLabel(p)}
            </button>
          );
        })}
      </div>

      {/* Steppers */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 text-center">Hour</div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-background h-12">
            <button
              type="button"
              onClick={() => bumpHour(-1)}
              className="h-full w-12 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent rounded-l-lg transition-colors"
              aria-label="Decrease hour"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-lg font-semibold tabular-nums">{hour}</span>
            <button
              type="button"
              onClick={() => bumpHour(1)}
              className="h-full w-12 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent rounded-r-lg transition-colors"
              aria-label="Increase hour"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 text-center">Minute</div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-background h-12">
            <button
              type="button"
              onClick={() => bumpMinute(-1)}
              className="h-full w-12 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent rounded-l-lg transition-colors"
              aria-label="Decrease minute"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-lg font-semibold tabular-nums">{String(minute).padStart(2, '0')}</span>
            <button
              type="button"
              onClick={() => bumpMinute(1)}
              className="h-full w-12 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent rounded-r-lg transition-colors"
              aria-label="Increase minute"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* AM/PM segmented */}
      <div className="grid grid-cols-2 gap-1.5">
        {(['AM', 'PM'] as const).map(p => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={cn(
              'h-10 rounded-md border text-sm font-semibold transition-colors',
              period === p
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background hover:bg-accent hover:text-accent-foreground',
            )}
          >
            {p}
          </button>
        ))}
      </div>

      {showDoneButton && (
        <Button type="button" size="sm" className="w-full" onClick={onClose}>
          <Check className="h-4 w-4 mr-1.5" />
          Done
        </Button>
      )}
    </div>
  );
}

export function TimePicker({
  value,
  onChange,
  placeholder = 'Select time',
  className,
  id,
  disabled,
  label,
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const display = value ? formatTimeLabel(value) : '';

  const trigger = (
    <button
      id={id}
      type="button"
      disabled={disabled}
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors',
        'hover:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        !display && 'text-muted-foreground',
        className,
      )}
    >
      <span className="flex items-center gap-2 truncate">
        <Clock className="h-4 w-4 shrink-0 opacity-60" />
        <span className="truncate">{display || placeholder}</span>
      </span>
    </button>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-xl">
          <SheetHeader>
            <SheetTitle>{label || placeholder}</SheetTitle>
          </SheetHeader>
          <div className="mt-3 pointer-events-auto">
            <TimePickerPanel
              value={value}
              onChange={onChange}
              onClose={() => setOpen(false)}
              showDoneButton
            />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        className="w-[300px] p-3 pointer-events-auto"
        align="start"
        sideOffset={4}
      >
        <TimePickerPanel
          value={value}
          onChange={onChange}
          label={label}
          onClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
