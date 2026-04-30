import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { SettingsNav } from '@/components/SettingsNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Save, Plus, Trash2, DollarSign, Clock, AlertCircle, Tag, Sparkles } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useUserProfile } from '@/contexts/UserProfileContext';
import {
  type DefaultRate,
  type BillingPreference,
  type RateBasis,
  buildPresets,
  newBlankRate,
  SHIFT_TYPE_OPTIONS,
  suggestRateName,
} from '@/lib/onboardingRateMapping';
import { inferShiftTypeFromName } from '@/lib/shiftTypeInference';

const MAX_NAME_LEN = 60;
const MAX_AMOUNT = 100000;
const CUSTOM_TYPE_KEY = '__custom__';
const NONE_TYPE_KEY = '__none__';

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

function validateRates(rates: DefaultRate[]): { errors: RateErrors; firstMessage?: string } {
  const errors: RateErrors = {};
  let firstMessage: string | undefined;
  const setErr = (id: string, field: 'name' | 'amount', msg: string) => {
    if (!errors[id]) errors[id] = {};
    if (!errors[id][field]) errors[id][field] = msg;
    if (!firstMessage) firstMessage = msg;
  };

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

  type Seen = { id: string; displayName: string };
  const firstSeen = new Map<string, Seen>();
  for (const r of rates) {
    const trimmed = r.name.trim();
    if (!trimmed) continue;
    const key = `${r.basis}:${trimmed.toLowerCase()}`;
    const prior = firstSeen.get(key);
    if (prior) {
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
    setRates(prev => prev.map(r => {
      if (r.id !== id) return r;
      const merged: DefaultRate = { ...r, ...patch };
      // When the user picks a shift type and the name is blank or still matches
      // the auto-suggestion for the previous type, refresh the auto-fill.
      if ('shift_type' in patch && patch.shift_type !== undefined) {
        const prevSuggestion = suggestRateName(r.shift_type, r.basis);
        const trimmed = (r.name || '').trim();
        if (!trimmed || trimmed === prevSuggestion) {
          merged.name = suggestRateName(patch.shift_type, r.basis);
        }
      }
      return merged;
    }));
    setErrors(prev => {
      const next = { ...prev };
      if (next[id]) {
        const fieldErrs = { ...next[id] };
        if ('name' in patch || 'shift_type' in patch) delete fieldErrs.name;
        if ('amount' in patch) delete fieldErrs.amount;
        if (!fieldErrs.name && !fieldErrs.amount) delete next[id];
        else next[id] = fieldErrs;
      }
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

  /**
   * Auto-fill `shift_type` for any rate where the name keyword strongly maps
   * to a known slug. Only patches untagged rows; never overwrites a user's
   * choice. The user still has to review and Save.
   */
  const suggestTypesForUntagged = () => {
    let touched = 0;
    setRates(prev => prev.map(r => {
      if (r.shift_type) return r;
      const guess = inferShiftTypeFromName(r.name);
      if (!guess) return r;
      touched += 1;
      return { ...r, shift_type: guess };
    }));
    if (touched > 0) {
      toast.success(`Suggested ${touched} shift type${touched === 1 ? '' : 's'} — review and Save`);
    } else {
      toast.message('No clear suggestions — pick a type from the dropdown for each rate');
    }
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
        .map((r, i) => ({
          ...r,
          sort_order: i,
          name: r.name.trim(),
          shift_type: r.shift_type?.trim() || undefined,
        }));
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

  const scopedRates = rates.filter(r =>
    preference === 'per_day' ? r.basis === 'daily' : r.basis === 'hourly',
  );
  const untaggedScopedCount = scopedRates.filter(r => r.name.trim() && !r.shift_type).length;

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
        Optional. Clinic-specific rates always take priority. If you charge the same rates
        across most clinics, save them here once and they'll show up as quick picks when you
        add a shift.
      </p>

      <div className="max-w-3xl space-y-6">
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

        {/* Review banner: any active rates missing a shift_type */}
        {untaggedScopedCount > 0 && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-primary/10 border border-primary/20">
            <Tag className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-foreground mb-0.5">
                Tag your rates by shift type
              </p>
              <p className="text-[12.5px] text-muted-foreground leading-relaxed">
                {untaggedScopedCount} rate{untaggedScopedCount === 1 ? '' : 's'} {untaggedScopedCount === 1 ? "doesn't" : "don't"} have a shift type yet. Tagging them lets us auto-categorize new shifts and show clearer line items on invoices.
              </p>
              <div className="mt-2">
                <Button type="button" size="sm" variant="ghost" onClick={suggestTypesForUntagged} className="-ml-2">
                  <Sparkles className="h-3.5 w-3.5 mr-1" /> Suggest types from rate names
                </Button>
              </div>
            </div>
          </div>
        )}



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

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  Always use my Rate Card for shift rates
                </p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  When on, new shifts default to your Rate Card and clinic-specific rates are
                  hidden from the picker. You can still add a custom rate per shift.
                </p>
              </div>
              <Switch
                checked={!!profile?.prefer_rate_card_default}
                onCheckedChange={async (v) => {
                  try {
                    await updateProfile({ prefer_rate_card_default: !!v });
                    toast.success(v ? 'Rate Card set as default' : 'Clinic rates re-enabled');
                  } catch {
                    toast.error('Could not update preference');
                  }
                }}
                aria-label="Always use my Rate Card for shift rates"
              />
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          Tip: Shift Type is optional but recommended — it lets you filter and report by the kind of
          relief work you take. Pick "Other (custom)…" to type your own.
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
      {/* Header row */}
      {rates.length > 0 && (
        <div className="hidden md:grid grid-cols-[180px_1fr_140px_36px] gap-2 px-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Shift type</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Rate name</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right pr-2">Amount</span>
          <span />
        </div>
      )}
      <div className="space-y-3">
        {rates.map(r => {
          const rowErr = errors[r.id];
          const nameErr = rowErr?.name;
          const amountErr = rowErr?.amount;
          const isKnownType = !!r.shift_type && SHIFT_TYPE_OPTIONS.some(o => o.value === r.shift_type);
          const isCustomType = !!r.shift_type && !isKnownType;
          const selectValue = !r.shift_type
            ? NONE_TYPE_KEY
            : isCustomType
            ? CUSTOM_TYPE_KEY
            : r.shift_type;
          return (
            <div key={r.id} className="space-y-1">
              <div className="grid grid-cols-1 md:grid-cols-[180px_1fr_140px_36px] gap-2 items-start">
                {/* Shift type */}
                <div className="space-y-1">
                  <Select
                    value={selectValue}
                    onValueChange={(v) => {
                      if (v === NONE_TYPE_KEY) {
                        onUpdate(r.id, { shift_type: undefined });
                      } else if (v === CUSTOM_TYPE_KEY) {
                        // Seed with empty string so the custom input renders
                        onUpdate(r.id, { shift_type: '' });
                      } else {
                        onUpdate(r.id, { shift_type: v });
                      }
                    }}
                  >
                    <SelectTrigger className="h-9" aria-label={`${title} shift type`}>
                      <SelectValue placeholder="Choose type…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_TYPE_KEY}>
                        <span className="text-muted-foreground">No type</span>
                      </SelectItem>
                      {SHIFT_TYPE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                      <SelectItem value={CUSTOM_TYPE_KEY}>Other (custom)…</SelectItem>
                    </SelectContent>
                  </Select>
                  {isCustomType || selectValue === CUSTOM_TYPE_KEY ? (
                    <Input
                      value={r.shift_type || ''}
                      maxLength={40}
                      onChange={e => onUpdate(r.id, { shift_type: e.target.value })}
                      placeholder="Type custom shift type"
                      className="h-8 text-xs"
                    />
                  ) : null}
                </div>

                {/* Rate name */}
                <Input
                  value={r.name}
                  maxLength={MAX_NAME_LEN}
                  onChange={e => onUpdate(r.id, { name: e.target.value })}
                  placeholder={basis === 'daily' ? 'Rate name (e.g. Weekend Day)' : 'Rate name (e.g. Standard Hour)'}
                  aria-label={`${title} name`}
                  aria-invalid={!!nameErr}
                  className={cn('h-9', nameErr && 'border-destructive focus-visible:ring-destructive')}
                />

                {/* Amount */}
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
                      'h-9 pl-7 pr-12 text-right',
                      amountErr && 'border-destructive focus-visible:ring-destructive',
                    )}
                    aria-label={`${title} amount`}
                    aria-invalid={!!amountErr}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    /{basis === 'daily' ? 'day' : 'hr'}
                  </span>
                </div>

                {/* Remove */}
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
