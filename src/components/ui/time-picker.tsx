import { useState, useEffect, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Clock, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export interface TimePickerProps {
  value: string; // 'HH:mm' (24h) or '' if unset
  onChange: (value: string) => void;
  placeholder?: string;
  /** When provided and value is empty, shows "+Nh from start" helper chips. */
  relativeToStart?: string; // 'HH:mm'
  className?: string;
  id?: string;
  disabled?: boolean;
  /** Optional label shown inside popover/sheet header */
  label?: string;
}

const PRESETS_24H = ['06:00', '07:00', '08:00', '09:00', '12:00', '14:00', '17:00', '20:00'];
const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
const MINUTE_OPTIONS = [0, 15, 30, 45];

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

function addHoursTo(value: string, hoursToAdd: number): string {
  const [h, m] = value.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '';
  const total = h * 60 + m + hoursToAdd * 60;
  // wrap within same day; cap at 23:59
  const capped = Math.min(total, 23 * 60 + 59);
  const hh = Math.floor(capped / 60);
  const mm = capped % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

interface PanelProps extends Omit<TimePickerProps, 'className' | 'id' | 'disabled' | 'placeholder'> {
  onClose: () => void;
}

function TimePickerPanel({ value, onChange, relativeToStart, label, onClose }: PanelProps) {
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

  const commit = (next: string) => {
    onChange(next);
    onClose();
  };

  const showRelative = !value && relativeToStart;
  const relativeOffsets = [4, 6, 8, 10, 12];

  return (
    <div className="space-y-4">
      {label && (
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
      )}

      {showRelative && (
        <div className="space-y-1.5">
          <div className="text-[11px] text-muted-foreground">
            From start ({formatTimeLabel(relativeToStart!)})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {relativeOffsets.map(h => {
              const result = addHoursTo(relativeToStart!, h);
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => commit(result)}
                  className="px-2.5 py-1.5 rounded-md text-xs font-medium border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                  title={`Ends at ${formatTimeLabel(result)}`}
                >
                  +{h}h
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <div className="text-[11px] text-muted-foreground">Quick pick</div>
        <div className="grid grid-cols-4 gap-1.5">
          {PRESETS_24H.map(p => {
            const isActive = value === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => commit(p)}
                className={cn(
                  'px-2 py-1.5 rounded-md text-xs font-medium border transition-colors',
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background hover:bg-accent hover:text-accent-foreground'
                )}
              >
                {formatTimeLabel(p)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="text-[11px] text-muted-foreground">Or set precisely</div>
        <div className="flex items-stretch gap-2">
          {/* Hours */}
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 text-center">Hr</div>
            <div className="h-32 overflow-y-auto rounded-md border border-border bg-background">
              {HOUR_OPTIONS.map(h => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHour(h)}
                  className={cn(
                    'w-full px-2 py-1 text-sm transition-colors',
                    hour === h
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
          {/* Minutes */}
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 text-center">Min</div>
            <div className="h-32 overflow-y-auto rounded-md border border-border bg-background">
              {MINUTE_OPTIONS.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMinute(m)}
                  className={cn(
                    'w-full px-2 py-1 text-sm transition-colors',
                    minute === m
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  {String(m).padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>
          {/* AM/PM */}
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 text-center">&nbsp;</div>
            <div className="grid grid-rows-2 gap-1 h-32">
              {(['AM', 'PM'] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={cn(
                    'rounded-md border text-sm font-semibold transition-colors',
                    period === p
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Button
        type="button"
        size="sm"
        className="w-full"
        onClick={() => commit(to24h(hour, minute, period))}
      >
        <Check className="h-4 w-4 mr-1.5" />
        Set time
      </Button>
    </div>
  );
}

export function TimePicker({
  value,
  onChange,
  placeholder = 'Select time',
  relativeToStart,
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
              relativeToStart={relativeToStart}
              onClose={() => setOpen(false)}
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
          relativeToStart={relativeToStart}
          label={label}
          onClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
