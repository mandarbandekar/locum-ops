import { useEffect, useMemo, useRef, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TimePickerProps {
  value: string; // 'HH:mm' (24h) or '' if unset
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
  /** Optional label (unused in new UI, kept for API compatibility) */
  label?: string;
  /** Increment in minutes between options. Defaults to 15. */
  step?: number;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function formatTimeLabel(value: string): string {
  if (!value) return '';
  const [hStr, mStr] = value.split(':');
  const h24 = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h24) || isNaN(m)) return '';
  const period = h24 >= 12 ? 'pm' : 'am';
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${pad(m)}${period}`;
}

function buildOptions(step: number): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  for (let mins = 0; mins < 24 * 60; mins += step) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const v = `${pad(h)}:${pad(m)}`;
    out.push({ value: v, label: formatTimeLabel(v) });
  }
  return out;
}

export function TimePicker({
  value,
  onChange,
  placeholder = 'Select time',
  className,
  id,
  disabled,
  step = 15,
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const options = useMemo(() => buildOptions(step), [step]);
  const display = value ? formatTimeLabel(value) : '';

  // Scroll selected (or 9:00am default) into view when opening
  useEffect(() => {
    if (!open) return;
    const target = value || '09:00';
    requestAnimationFrame(() => {
      const el = listRef.current?.querySelector<HTMLElement>(`[data-value="${target}"]`);
      el?.scrollIntoView({ block: 'center' });
    });
  }, [open, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
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
      </PopoverTrigger>
      <PopoverContent
        className="w-[180px] p-0 pointer-events-auto"
        align="start"
        sideOffset={4}
      >
        <div
          ref={listRef}
          className="max-h-64 overflow-y-auto py-1"
          role="listbox"
        >
          {options.map(opt => {
            const isActive = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isActive}
                data-value={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  'w-full text-left px-3 py-1.5 text-sm transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'hover:bg-accent hover:text-accent-foreground',
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
