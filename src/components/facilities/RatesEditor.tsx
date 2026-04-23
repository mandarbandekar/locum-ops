import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RateKind, PredefinedRateKey } from '@/types';

export interface RateEntry {
  type: string;
  label: string;
  amount: number;
  kind: RateKind;
}

const PREDEFINED_RATE_TYPES = [
  { type: 'weekday', label: 'Weekday Rate' },
  { type: 'weekend', label: 'Weekend Rate' },
  { type: 'partial_day', label: 'Partial Day Rate' },
  { type: 'holiday', label: 'Holiday Rate' },
  { type: 'telemedicine', label: 'Telemedicine Rate' },
  { type: 'custom', label: 'Custom Rate' },
] as const;

/** Map TermsSnapshot fields to RateEntry array */
export function termsToRates(terms: {
  weekday_rate?: number;
  weekend_rate?: number;
  partial_day_rate?: number;
  holiday_rate?: number;
  telemedicine_rate?: number;
  custom_rates?: Array<{ label: string; amount: number; kind?: RateKind }>;
  rate_kinds?: Partial<Record<PredefinedRateKey, RateKind>>;
}): RateEntry[] {
  const entries: RateEntry[] = [];
  const kinds = terms.rate_kinds || {};
  const k = (key: PredefinedRateKey): RateKind => kinds[key] || 'flat';
  const push = (key: PredefinedRateKey, label: string, amount?: number) => {
    if (!amount) return;
    entries.push({ type: key, label, amount, kind: k(key) });
  };
  push('weekday', 'Weekday Rate', terms.weekday_rate);
  push('weekend', 'Weekend Rate', terms.weekend_rate);
  push('partial_day', 'Partial Day Rate', terms.partial_day_rate);
  push('holiday', 'Holiday Rate', terms.holiday_rate);
  push('telemedicine', 'Telemedicine Rate', terms.telemedicine_rate);
  if (terms.custom_rates) {
    terms.custom_rates.forEach(cr => {
      entries.push({ type: 'custom', label: cr.label, amount: cr.amount, kind: cr.kind || 'flat' });
    });
  }
  return entries;
}

/** Map RateEntry array back to terms fields */
export function ratesToTermsFields(rates: RateEntry[]) {
  const fields = {
    weekday_rate: 0,
    weekend_rate: 0,
    partial_day_rate: 0,
    holiday_rate: 0,
    telemedicine_rate: 0,
    custom_rates: [] as Array<{ label: string; amount: number; kind?: RateKind }>,
    rate_kinds: {} as Partial<Record<PredefinedRateKey, RateKind>>,
  };
  for (const r of rates) {
    switch (r.type) {
      case 'weekday': fields.weekday_rate = r.amount; fields.rate_kinds.weekday = r.kind; break;
      case 'weekend': fields.weekend_rate = r.amount; fields.rate_kinds.weekend = r.kind; break;
      case 'partial_day': fields.partial_day_rate = r.amount; fields.rate_kinds.partial_day = r.kind; break;
      case 'holiday': fields.holiday_rate = r.amount; fields.rate_kinds.holiday = r.kind; break;
      case 'telemedicine': fields.telemedicine_rate = r.amount; fields.rate_kinds.telemedicine = r.kind; break;
      case 'custom':
        fields.custom_rates.push({ label: r.label, amount: r.amount, kind: r.kind });
        break;
    }
  }
  return fields;
}

interface RatesEditorProps {
  rates: RateEntry[];
  onChange: (rates: RateEntry[]) => void;
  onSave?: (rates: RateEntry[]) => void;
  showCard?: boolean;
  compact?: boolean;
}

export function RatesEditor({ rates, onChange, onSave, showCard = true, compact = false }: RatesEditorProps) {
  const [addingType, setAddingType] = useState('');

  const usedTypes = rates.filter(r => r.type !== 'custom').map(r => r.type);
  const availableTypes = PREDEFINED_RATE_TYPES.filter(
    t => t.type === 'custom' || !usedTypes.includes(t.type)
  );

  const handleAddRate = useCallback((typeValue: string) => {
    const def = PREDEFINED_RATE_TYPES.find(t => t.type === typeValue);
    if (!def) return;
    const newRate: RateEntry = {
      type: def.type,
      label: def.type === 'custom' ? '' : def.label,
      amount: 0,
      kind: 'flat',
    };
    onChange([...rates, newRate]);
    setAddingType('');
  }, [rates, onChange]);

  const handleUpdateRate = useCallback((index: number, patch: Partial<RateEntry>) => {
    const updated = rates.map((r, i) => i === index ? { ...r, ...patch } : r);
    onChange(updated);
  }, [rates, onChange]);

  const handleRemoveRate = useCallback((index: number) => {
    const updated = rates.filter((_, i) => i !== index);
    onChange(updated);
    onSave?.(updated);
  }, [rates, onChange, onSave]);

  const handleBlurSave = useCallback(() => {
    onSave?.(rates);
  }, [rates, onSave]);

  const hasHourly = rates.some(r => r.kind === 'hourly');

  const content = (
    <div className="space-y-3">
      {rates.length === 0 && (
        <p className="text-sm text-muted-foreground">No rates configured. Add your first rate below.</p>
      )}
      {rates.map((rate, i) => (
        <div key={i} className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            {rate.type === 'custom' ? (
              <Input
                value={rate.label}
                onChange={e => handleUpdateRate(i, { label: e.target.value })}
                onBlur={handleBlurSave}
                placeholder="Rate name"
                className="flex-1 min-w-[140px]"
              />
            ) : (
              <span className="flex-1 min-w-[120px] text-sm font-medium">{rate.label}</span>
            )}

            {/* Flat / Hourly segmented toggle */}
            <div className="inline-flex rounded-md border border-border overflow-hidden h-9 shrink-0" role="group">
              {(['flat', 'hourly'] as RateKind[]).map(k => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    const patch: Partial<RateEntry> = { kind: k };
                    handleUpdateRate(i, patch);
                    onSave?.(rates.map((r, idx) => idx === i ? { ...r, ...patch } : r));
                  }}
                  className={cn(
                    'px-2.5 text-[11px] font-medium transition-colors',
                    rate.kind === k
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:bg-muted',
                  )}
                >
                  {k === 'flat' ? 'Flat' : 'Hourly'}
                </button>
              ))}
            </div>

            <div className="relative w-32 shrink-0">
              <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="number"
                value={rate.amount || ''}
                onChange={e => handleUpdateRate(i, { amount: Number(e.target.value) })}
                onBlur={handleBlurSave}
                placeholder="0"
                className="pl-7 pr-10"
                min={0}
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">
                {rate.kind === 'hourly' ? '/hr' : '/day'}
              </span>
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => handleRemoveRate(i)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}

      {hasHourly && (
        <p className="text-[11px] text-muted-foreground">
          Hourly rates: total per shift will be calculated from shift hours.
        </p>
      )}

      {availableTypes.length > 0 && (
        <div className="flex items-center gap-2 pt-1">
          <Select value={addingType} onValueChange={v => { setAddingType(v); handleAddRate(v); }}>
            <SelectTrigger className={compact ? "w-full" : "w-48"}>
              <SelectValue placeholder="Add a rate…" />
            </SelectTrigger>
            <SelectContent>
              {availableTypes.map(t => (
                <SelectItem key={t.type + (t.type === 'custom' ? rates.filter(r => r.type === 'custom').length : '')} value={t.type}>
                  <span className="flex items-center gap-1.5">
                    <Plus className="h-3 w-3" /> {t.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );

  if (!showCard) return content;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" /> Shift Rates
        </CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
