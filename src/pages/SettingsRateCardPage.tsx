import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { SettingsNav } from '@/components/SettingsNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Save, Plus, Trash2, DollarSign, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserProfile } from '@/contexts/UserProfileContext';
import {
  type DefaultRate,
  type BillingPreference,
  type RateBasis,
  buildPresets,
  newBlankRate,
} from '@/lib/onboardingRateMapping';

const MAX_NAME_LEN = 60;
const MAX_AMOUNT = 100000;

const rateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(MAX_NAME_LEN, `Name must be ${MAX_NAME_LEN} characters or less`),
  amount: z
    .number({ invalid_type_error: 'Enter a valid amount' })
    .finite('Enter a valid amount')
    .gt(0, 'Amount must be greater than 0')
    .max(MAX_AMOUNT, `Amount must be ${MAX_AMOUNT.toLocaleString()} or less`),
});

type RateErrors = Record<string, { name?: string; amount?: string }>;

const PREF_OPTIONS: { value: BillingPreference; label: string; sub: string; icon: typeof DollarSign }[] = [
  { value: 'per_day', label: 'Per Day', sub: 'Flat day rate', icon: DollarSign },
  { value: 'per_hour', label: 'Per Hour', sub: 'Hourly billing', icon: Clock },
];

function coercePreference(p: BillingPreference | undefined): BillingPreference {
  return p === 'per_hour' ? 'per_hour' : 'per_day';
}

/**
 * Validates rates and returns:
 *  - field-level errors keyed by row id
 *  - the first user-visible error message (used in toast)
 *
 * Duplicate detection is per-basis, case-insensitive on trimmed names.
 * On a conflict, BOTH rows get an error message that names the original
 * (display-cased) rate they collide with, so users can see exactly what
 * already exists.
 */
function validateRates(rates: DefaultRate[]): { errors: RateErrors; firstMessage?: string } {
  const errors: RateErrors = {};
  let firstMessage: string | undefined;
  const setErr = (id: string, field: 'name' | 'amount', msg: string) => {
    if (!errors[id]) errors[id] = {};
    // Don't overwrite an existing error on the same field — the first one wins
    if (!errors[id][field]) errors[id][field] = msg;
    if (!firstMessage) firstMessage = msg;
  };

  // Per-row schema validation (skip rows that are entirely empty — they'll be dropped)
  for (const r of rates) {
    const isBlankRow = !r.name.trim() && (!r.amount || r.amount === 0);
    if (isBlankRow) continue;
    const result = rateSchema.safeParse({ name: r.name, amount: r.amount });
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0] as 'name' | 'amount';
        setErr(r.id, field, issue.message);
      }
    }
  }

  // Duplicate name check — track first occurrence so we can reference it
  // in the error message on subsequent conflicting rows.
  type Seen = { id: string; displayName: string };
  const firstSeen = new Map<string, Seen>(); // key=`${basis}:${lower-name}` → first row info
  for (const r of rates) {
    const trimmed = r.name.trim();
    if (!trimmed) continue;
    const key = `${r.basis}:${trimmed.toLowerCase()}`;
    const prior = firstSeen.get(key);
    if (prior) {
      // Both rows error, each pointing at the OTHER row's display name
      setErr(r.id, 'name', `Duplicate of "${prior.displayName}" — rate names must be unique`);
      setErr(prior.id, 'name', `Duplicate of "${trimmed}" — rate names must be unique`);
    } else {
      firstSeen.set(key, { id: r.id, displayName: trimmed });
    }
  }

  return { errors, firstMessage };
}

export default function SettingsRateCardPage() {
  const { profile, updateProfile, profileLoading } = useUserProfile();
  const [preference, setPreference] = useState<BillingPreference>('per_day');
  const [rates, setRates] = useState<DefaultRate[]>([]);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [errors, setErrors] = useState<RateErrors>({});

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
    const hasForBasis = rates.some(r => (value === 'per_day' ? r.basis === 'daily' : r.basis === 'hourly'));
    if (!hasForBasis) {
      setRates(prev => [...prev, ...buildPresets(value)]);
    }
  };

  const updateRate = (id: string, patch: Partial<DefaultRate>) => {
    setRates(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
    // When a row's name changes, recompute duplicate errors across the whole
    // list so the conflicting row clears too. Schema errors on this row also clear.
    setErrors(prev => {
      const next = { ...prev };
      if (next[id]) {
        const fieldErrs = { ...next[id] };
        if ('name' in patch) delete fieldErrs.name;
        if ('amount' in patch) delete fieldErrs.amount;
        if (!fieldErrs.name && !fieldErrs.amount) delete next[id];
        else next[id] = fieldErrs;
      }
      // Drop ALL duplicate-name errors — they'll be revalidated on next save.
      // (Cheap heuristic: any name error containing "Duplicate" gets cleared.)
      for (const k of Object.keys(next)) {
        if (next[k]?.name?.startsWith('Duplicate')) {
          const { name: _omit, ...rest } = next[k];
          if (rest.amount) next[k] = rest;
          else delete next[k];
        }
      }
      return next;
    });
  };

  const removeRate = (id: string) => {
    setRates(prev => prev.filter(r => r.id !== id));
    setErrors(prev => {
      if (!prev[id]) return prev;
      const { [id]: _omit, ...rest } = prev;
      return rest;
    });
  };

  const addRate = (basis: RateBasis) => {
    setRates(prev => {
      const nextOrder = prev.filter(r => r.basis === basis).length;
      return [...prev, newBlankRate(basis, nextOrder)];
    });
  };

  const handleSave = async () => {
    const scoped = rates.filter(r =>
      preference === 'per_day' ? r.basis === 'daily' : r.basis === 'hourly',
    );
    const { errors: validationErrors, firstMessage } = validateRates(scoped);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      toast.error(firstMessage || 'Please fix the highlighted fields');
      return;
    }

    setSaving(true);
    try {
      const cleaned = rates
        .filter(r => r.name.trim() && r.amount > 0)
        .map((r, i) => ({ ...r, sort_order: i, name: r.name.trim() }));
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
                errors={errors}
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
                errors={errors}
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
  errors: RateErrors;
  onUpdate: (id: string, patch: Partial<DefaultRate>) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}

function RateSection({ title, basis, rates, errors, onUpdate, onRemove, onAdd }: RateSectionProps) {
  return (
    <div className="space-y-3">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </Label>
      <div className="space-y-3">
        {rates.map(r => {
          const rowErr = errors[r.id];
          const nameErr = rowErr?.name;
          const amountErr = rowErr?.amount;
          return (
            <div key={r.id} className="space-y-1">
              <div className="grid grid-cols-[1fr_140px_36px] gap-2 items-start">
                <Input
                  value={r.name}
                  maxLength={MAX_NAME_LEN}
                  onChange={e => onUpdate(r.id, { name: e.target.value })}
                  placeholder={basis === 'daily' ? 'Rate name (e.g. Weekend Day)' : 'Rate name (e.g. Standard Hour)'}
                  aria-label={`${title} name`}
                  aria-invalid={!!nameErr}
                  className={cn(nameErr && 'border-destructive focus-visible:ring-destructive')}
                />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={MAX_AMOUNT}
                    step={basis === 'daily' ? '10' : '1'}
                    value={r.amount === 0 ? '' : r.amount}
                    onChange={e => {
                      const raw = e.target.value;
                      const parsed = raw === '' ? 0 : Number(raw);
                      const safe = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
                      onUpdate(r.id, { amount: safe });
                    }}
                    placeholder="0"
                    className={cn(
                      'pl-7 pr-12 text-right',
                      amountErr && 'border-destructive focus-visible:ring-destructive',
                    )}
                    aria-label={`${title} amount`}
                    aria-invalid={!!amountErr}
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
              {(nameErr || amountErr) && (
                <div className="flex items-start gap-1.5 text-xs text-destructive pl-0.5">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>{nameErr || amountErr}</span>
                </div>
              )}
            </div>
          );
        })}
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
