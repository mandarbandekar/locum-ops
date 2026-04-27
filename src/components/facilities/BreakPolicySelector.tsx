import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * 4-option segmented control for selecting unpaid break minutes.
 * Returns null = paid, 30/60 = preset, custom = whatever number the user types (>0).
 */

export type BreakOption = 'paid' | 'unpaid_30' | 'unpaid_60' | 'custom';

export function breakMinutesToOption(min: number | null | undefined): BreakOption {
  if (min == null || min === 0) return 'paid';
  if (min === 30) return 'unpaid_30';
  if (min === 60) return 'unpaid_60';
  return 'custom';
}

export function optionToBreakMinutes(opt: BreakOption, customMinutes: number): number | null {
  if (opt === 'paid') return null;
  if (opt === 'unpaid_30') return 30;
  if (opt === 'unpaid_60') return 60;
  return Math.max(1, Math.min(240, Math.round(customMinutes || 0)));
}

interface Props {
  value: number | null;
  onChange: (next: number | null) => void;
  /** Optional helper text shown beneath the control. */
  helper?: string;
  /** Compact mode (smaller padding) for tighter forms. */
  compact?: boolean;
}

const OPTIONS: { value: BreakOption; label: string }[] = [
  { value: 'paid', label: 'Paid (no deduction)' },
  { value: 'unpaid_30', label: 'Unpaid 30 min' },
  { value: 'unpaid_60', label: 'Unpaid 60 min' },
  { value: 'custom', label: 'Custom' },
];

export function BreakPolicySelector({ value, onChange, helper, compact }: Props) {
  // Track the user-selected option locally so that picking "Custom" doesn't
  // immediately collapse back to a preset when the typed value happens to be 30/60.
  const derivedOpt = breakMinutesToOption(value);
  const [opt, setOpt] = useState<BreakOption>(derivedOpt);

  // Local string state for the custom input so the user can clear/retype freely.
  const [customStr, setCustomStr] = useState<string>(
    derivedOpt === 'custom' ? String(value ?? '') : (value && value > 0 ? String(value) : '45'),
  );

  // Keep local opt in sync if the parent value changes externally (e.g. clinic switch),
  // but never override an explicit "custom" selection just because the value matches a preset.
  const lastValueRef = useRef<number | null | undefined>(value);
  useEffect(() => {
    if (lastValueRef.current !== value) {
      lastValueRef.current = value;
      const next = breakMinutesToOption(value);
      // Only flip away from "custom" if the new value clearly isn't custom-driven by us.
      if (opt !== 'custom' || (value !== null && value !== undefined && (value === 30 || value === 60 || value === 0 || value == null))) {
        if (opt === 'custom' && value && value !== 30 && value !== 60) {
          setCustomStr(String(value));
        } else {
          setOpt(next);
          if (next === 'custom' && value != null) setCustomStr(String(value));
        }
      }
    }
  }, [value, opt]);

  const handleSelect = (next: BreakOption) => {
    setOpt(next);
    if (next === 'custom') {
      const parsed = parseInt(customStr, 10);
      const minutes = Number.isFinite(parsed) && parsed > 0
        ? Math.max(1, Math.min(240, parsed))
        : 45; // sensible default for "custom" that isn't 30 or 60
      setCustomStr(String(minutes));
      onChange(minutes);
    } else {
      onChange(optionToBreakMinutes(next, 0));
    }
  };

  return (
    <div className="space-y-2">
      <div
        className={cn(
          'grid grid-cols-2 sm:grid-cols-4 gap-1.5',
        )}
        role="radiogroup"
      >
        {OPTIONS.map(o => {
          const selected = opt === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => handleSelect(o.value)}
              className={cn(
                'rounded-md px-2.5 text-[12px] font-medium leading-tight transition-all text-center',
                compact ? 'py-1.5' : 'py-2',
                selected
                  ? 'border border-[#1A5C6B] bg-[#E1ECEF] text-[#1A5C6B] dark:bg-[#1A5C6B]/30 dark:text-[#BFE0E8] dark:border-[#1A5C6B]'
                  : 'border border-[#D8D2C4] bg-background text-muted-foreground hover:bg-muted dark:border-border',
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>

      {opt === 'custom' && (
        <div className="flex items-center gap-2">
          <label className="text-[12px] text-muted-foreground" htmlFor="break-custom-min">
            Unpaid break (minutes)
          </label>
          <Input
            id="break-custom-min"
            type="number"
            min={1}
            max={240}
            value={customStr}
            onChange={(e) => {
              const raw = e.target.value;
              setCustomStr(raw);
              if (raw === '') return; // allow empty while typing; don't push to parent yet
              const n = parseInt(raw, 10);
              if (!Number.isFinite(n)) return;
              onChange(Math.max(1, Math.min(240, n)));
            }}
            onBlur={() => {
              const n = parseInt(customStr, 10);
              if (!Number.isFinite(n) || n < 1) {
                setCustomStr('1');
                onChange(1);
              } else {
                const clamped = Math.max(1, Math.min(240, n));
                setCustomStr(String(clamped));
                onChange(clamped);
              }
            }}
            className="h-8 w-24 text-sm"
          />
        </div>
      )}

      {helper && <p className="text-[11px] text-muted-foreground">{helper}</p>}
    </div>
  );
}
