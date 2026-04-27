import { useEffect, useMemo, useState } from 'react';
import { SettingsNav } from '@/components/SettingsNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Save, Plus, Trash2, DollarSign, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserProfile } from '@/contexts/UserProfileContext';
import {
  type DefaultRate,
  type BillingPreference,
  type RateBasis,
  buildPresets,
  newBlankRate,
} from '@/lib/onboardingRateMapping';

const PREF_OPTIONS: { value: BillingPreference; label: string; sub: string; icon: typeof DollarSign }[] = [
  { value: 'per_day', label: 'Per Day', sub: 'Flat day rate', icon: DollarSign },
  { value: 'per_hour', label: 'Per Hour', sub: 'Hourly billing', icon: Clock },
];

function coercePreference(p: BillingPreference | undefined): BillingPreference {
  return p === 'per_hour' ? 'per_hour' : 'per_day';
}

export default function SettingsRateCardPage() {
  const { profile, updateProfile, profileLoading } = useUserProfile();
  const [preference, setPreference] = useState<BillingPreference>('per_day');
  const [rates, setRates] = useState<DefaultRate[]>([]);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!profile || initialized) return;
    const pref = coercePreference(profile.default_billing_preference);
    setPreference(pref);
    setRates(profile.default_rates && profile.default_rates.length > 0
      ? profile.default_rates
      : buildPresets(pref));
    setInitialized(true);
  }, [profile, initialized]);

  const dailyRates = useMemo(
    () => rates.filter(r => r.basis === 'daily').sort((a, b) => a.sort_order - b.sort_order),
    [rates],
  );
  const hourlyRates = useMemo(
    () => rates.filter(r => r.basis === 'hourly').sort((a, b) => a.sort_order - b.sort_order),
    [rates],
  );

  const handleSelectPreference = (value: BillingPreference) => {
    setPreference(value);
    // If there are no existing rates for the new basis, seed presets for it
    const hasForBasis = rates.some(r => (value === 'per_day' ? r.basis === 'daily' : r.basis === 'hourly'));
    if (!hasForBasis) {
      setRates(prev => [...prev, ...buildPresets(value)]);
    }
  };

  const updateRate = (id: string, patch: Partial<DefaultRate>) => {
    setRates(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
  };
  const removeRate = (id: string) => {
    setRates(prev => prev.filter(r => r.id !== id));
  };
  const addRate = (basis: RateBasis) => {
    setRates(prev => {
      const nextOrder = prev.filter(r => r.basis === basis).length;
      return [...prev, newBlankRate(basis, nextOrder)];
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Strip blank rows on save
      const cleaned = rates
        .filter(r => r.name.trim() && r.amount > 0)
        .map((r, i) => ({ ...r, sort_order: i }));
      await updateProfile({
        default_rates: cleaned,
        default_billing_preference: preference,
      });
      setRates(cleaned);
      toast.success('Rate Card saved');
    } catch (e) {
      console.error(e);
      toast.error('Could not save Rate Card');
    } finally {
      setSaving(false);
    }
  };

  const showDaily = preference === 'per_day';
  const showHourly = preference === 'per_hour';

  return (
    <div>
      <SettingsNav />
      <div className="page-header">
        <h1 className="page-title">Rate Card</h1>
        <Button size="sm" onClick={handleSave} disabled={saving || profileLoading}>
          <Save className="mr-1 h-4 w-4" /> {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
        These are your default rates. They autopopulate when you add a new clinic or create a new shift.
        You can always override them per clinic or per shift.
      </p>

      <div className="max-w-2xl space-y-6">
        {/* Billing preference */}
        <div className="grid grid-cols-2 gap-3">
          {PREF_OPTIONS.map(opt => {
            const Icon = opt.icon;
            const selected = preference === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelectPreference(opt.value)}
                className={cn(
                  'text-left rounded-lg border p-4 transition-all',
                  selected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                    : 'border-border hover:border-primary/40 hover:bg-muted/40',
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className={cn('h-4 w-4', selected ? 'text-primary' : 'text-muted-foreground')} />
                  <span className="font-semibold text-sm text-foreground">{opt.label}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{opt.sub}</p>
              </button>
            );
          })}
        </div>

        <Card>
          <CardContent className="pt-5 space-y-5">
            {showDaily && (
              <RateSection
                title="Daily rates"
                basis="daily"
                rates={dailyRates}
                onUpdate={updateRate}
                onRemove={removeRate}
                onAdd={() => addRate('daily')}
              />
            )}
            {showHourly && (
              <RateSection
                title="Hourly rates"
                basis="hourly"
                rates={hourlyRates}
                onUpdate={updateRate}
                onRemove={removeRate}
                onAdd={() => addRate('hourly')}
              />
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          Tip: leave the dollar field blank for any preset that doesn't apply to you — it won't be saved.
        </p>
      </div>
    </div>
  );
}

interface RateSectionProps {
  title: string;
  basis: RateBasis;
  rates: DefaultRate[];
  onUpdate: (id: string, patch: Partial<DefaultRate>) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}

function RateSection({ title, basis, rates, onUpdate, onRemove, onAdd }: RateSectionProps) {
  return (
    <div className="space-y-3">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </Label>
      <div className="space-y-2">
        {rates.map(r => (
          <div key={r.id} className="grid grid-cols-[1fr_140px_36px] gap-2 items-center">
            <Input
              value={r.name}
              onChange={e => onUpdate(r.id, { name: e.target.value })}
              placeholder={basis === 'daily' ? 'Rate name (e.g. Weekend Day)' : 'Rate name (e.g. Standard Hour)'}
              aria-label={`${title} name`}
            />
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step={basis === 'daily' ? '10' : '1'}
                value={r.amount === 0 ? '' : r.amount}
                onChange={e => onUpdate(r.id, { amount: Number(e.target.value) || 0 })}
                placeholder="0"
                className="pl-7 pr-12 text-right"
                aria-label={`${title} amount`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                /{basis === 'daily' ? 'day' : 'hr'}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onRemove(r.id)}
              aria-label="Remove rate"
              className="h-9 w-9 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {rates.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No {basis} rates yet.</p>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onAdd}
        className="text-primary hover:text-primary hover:bg-primary/5 -ml-2"
      >
        <Plus className="h-3.5 w-3.5 mr-1" /> Add custom rate
      </Button>
    </div>
  );
}
