import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Plus, Check, Building2, IdCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ShiftRateOption } from './ShiftFormDialog';

interface RateSourcePickerProps {
  rateOptions: ShiftRateOption[];
  selectedRateKey: string;
  rate: string;
  /** Hide the "From this clinic" pane regardless of facility rates. */
  preferRateCardOnly?: boolean;
  onSelect: (key: string, opt: ShiftRateOption) => void;
  onCustom: () => void;
}

function formatRow(opt: ShiftRateOption) {
  return (
    <span className="flex items-baseline gap-1.5 min-w-0">
      {opt.shift_type && (
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
          [{opt.shift_type.toUpperCase()}]
        </span>
      )}
      <span className="text-sm text-foreground truncate">{opt.label}</span>
      <span className="text-xs text-muted-foreground ml-auto shrink-0 pl-2">
        ${opt.amount.toLocaleString()}{opt.kind === 'hourly' ? '/hr' : '/day'}
      </span>
    </span>
  );
}

function Pane({
  title,
  icon: Icon,
  options,
  rateOptions,
  selectedRateKey,
  rate,
  onSelect,
  empty,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  options: ShiftRateOption[];
  rateOptions: ShiftRateOption[];
  selectedRateKey: string;
  rate: string;
  onSelect: (key: string, opt: ShiftRateOption) => void;
  empty?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-background flex flex-col min-h-0">
      <div className="px-3 py-2 border-b border-border flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {options.length} {options.length === 1 ? 'rate' : 'rates'}
        </span>
      </div>
      {options.length === 0 ? (
        <div className="px-3 py-6 text-center text-xs text-muted-foreground">
          {empty || 'No rates available.'}
        </div>
      ) : (
        <ScrollArea className="max-h-56">
          <ul className="py-1">
            {options.map((opt) => {
              const i = rateOptions.indexOf(opt);
              const key = `rate-${i}`;
              const isSelected =
                selectedRateKey === key ||
                (!selectedRateKey && rate === opt.amount.toString());
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => onSelect(key, opt)}
                    className={cn(
                      'w-full text-left px-3 py-2 flex items-center gap-2 transition-colors',
                      'hover:bg-muted/60',
                      isSelected && 'bg-primary/10',
                    )}
                  >
                    <span
                      className={cn(
                        'h-4 w-4 rounded-full border flex items-center justify-center shrink-0',
                        isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
                      )}
                    >
                      {isSelected && <Check className="h-2.5 w-2.5" />}
                    </span>
                    {formatRow(opt)}
                  </button>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      )}
    </div>
  );
}

export function RateSourcePicker({
  rateOptions,
  selectedRateKey,
  rate,
  preferRateCardOnly = false,
  onSelect,
  onCustom,
}: RateSourcePickerProps) {
  const facilityOpts = preferRateCardOnly ? [] : rateOptions.filter((o) => o.source === 'facility');
  const cardOpts = rateOptions.filter((o) => o.source === 'rate_card');

  // Resolve current selection for the footer summary.
  const selectedOpt = (() => {
    if (selectedRateKey?.startsWith('rate-')) {
      const idx = parseInt(selectedRateKey.replace('rate-', ''), 10);
      return rateOptions[idx];
    }
    if (rate) {
      return rateOptions.find((o) => o.amount.toString() === rate);
    }
    return undefined;
  })();

  // If preferRateCardOnly OR only one source has rates, render single column full-width.
  const showSplit = !preferRateCardOnly && facilityOpts.length > 0 && cardOpts.length > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Choose a rate
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCustom}
          className="h-7 px-2 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" /> Custom rate
        </Button>
      </div>

      {showSplit ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Pane
            title="From this clinic"
            icon={Building2}
            options={facilityOpts}
            rateOptions={rateOptions}
            selectedRateKey={selectedRateKey}
            rate={rate}
            onSelect={onSelect}
          />
          <Pane
            title="From your Rate Card"
            icon={IdCard}
            options={cardOpts}
            rateOptions={rateOptions}
            selectedRateKey={selectedRateKey}
            rate={rate}
            onSelect={onSelect}
          />
        </div>
      ) : facilityOpts.length > 0 ? (
        <Pane
          title="From this clinic"
          icon={Building2}
          options={facilityOpts}
          rateOptions={rateOptions}
          selectedRateKey={selectedRateKey}
          rate={rate}
          onSelect={onSelect}
        />
      ) : (
        <Pane
          title="From your Rate Card"
          icon={IdCard}
          options={cardOpts}
          rateOptions={rateOptions}
          selectedRateKey={selectedRateKey}
          rate={rate}
          onSelect={onSelect}
          empty="No Rate Card entries yet. Add some in Settings → Rate Card."
        />
      )}

      {selectedOpt && (
        <p className="text-[11px] text-muted-foreground">
          Selected:{' '}
          <span className="font-medium text-foreground">
            {selectedOpt.label} — ${selectedOpt.amount.toLocaleString()}
            {selectedOpt.kind === 'hourly' ? '/hr' : '/day'}
          </span>
          {' · '}
          {selectedOpt.source === 'facility' ? 'from this clinic' : 'from your Rate Card'}
        </p>
      )}
    </div>
  );
}
