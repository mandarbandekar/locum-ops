import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, DollarSign, Clock, Wand2, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type DefaultRate,
  type BillingPreference,
  type RateBasis,
  buildPresets,
  newBlankRate,
} from '@/lib/onboardingRateMapping';
import { trackOnboarding } from '@/lib/onboardingAnalytics';

interface Props {
  initialRates: DefaultRate[];
  initialPreference: BillingPreference;
  onChange: (rates: DefaultRate[], preference: BillingPreference) => void;
  /**
   * Optional: derived from existing clinic rates (read-only).
   * When present AND the user has no `default_rates` yet, a one-time banner is
   * shown offering to backfill the Rate Card from existing clinic data, or to
   * skip setting up a Rate Card now.
   *
   * IMPORTANT: backfill never mutates clinic rate records — it only seeds this
   * editor's state.
   */
  existingClinicRates?: DefaultRate[];
  existingClinicPreference?: BillingPreference;
  /** Called when user picks "Skip for now" — parent decides how to advance. */
  onSkip?: () => void;
}

const PREF_OPTIONS: { value: BillingPreference; label: string; sub: string; icon: typeof DollarSign }[] = [
  { value: 'per_day', label: 'Per Day', sub: 'Flat day rate', icon: DollarSign },
  { value: 'per_hour', label: 'Per Hour', sub: 'Hourly billing', icon: Clock },
];

function coercePreference(p: BillingPreference | undefined): BillingPreference {
  return p === 'per_hour' ? 'per_hour' : 'per_day';
}

export function OnboardingRateCard({
  initialRates,
  initialPreference,
  onChange,
  existingClinicRates,
  existingClinicPreference,
  onSkip,
}: Props) {
  const [preference, setPreference] = useState<BillingPreference>(coercePreference(initialPreference));
  const [rates, setRates] = useState<DefaultRate[]>(initialRates && initialRates.length > 0 ? initialRates : []);
  const [touched, setTouched] = useState(initialRates && initialRates.length > 0);

  // Show the backfill/skip banner only when:
  //   - user has not yet saved a Rate Card (initialRates empty)
  //   - we found existing clinic rates we could backfill from
  //   - user hasn't dismissed/acted on it this session
  const [bannerActive, setBannerActive] = useState(
    (initialRates?.length ?? 0) === 0 && (existingClinicRates?.length ?? 0) > 0,
  );

  // Initialize defaults the first time a preference is selected (or if rates are empty).
  useEffect(() => {
    if (!touched) {
      setRates(buildPresets(preference));
    }
    trackOnboarding('onboarding_rate_card_viewed', {
      initial_rate_count: initialRates?.length ?? 0,
      initial_preference: initialPreference || 'per_day',
      has_existing_clinic_rates: (existingClinicRates?.length ?? 0) > 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bubble up state changes
  useEffect(() => {
    onChange(rates, preference);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rates, preference]);

  const handleBackfillFromClinics = () => {
    if (!existingClinicRates || existingClinicRates.length === 0) return;
    setRates(existingClinicRates);
    if (existingClinicPreference) setPreference(existingClinicPreference);
    setTouched(true);
    setBannerActive(false);
    trackOnboarding('onboarding_rate_card_backfilled_from_clinics' as any, {
      backfilled_rate_count: existingClinicRates.length,
    });
  };

  const handleSelectPreference = (value: BillingPreference) => {
    setPreference(value);
    // Replace presets only if the user hasn't customized yet OR we're switching preference fresh
    setRates(buildPresets(value));
    setTouched(true);
    trackOnboarding('onboarding_billing_preference_selected', { preference: value });
  };

  const updateRate = (id: string, patch: Partial<DefaultRate>) => {
    setRates(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
  };
  const removeRate = (id: string) => {
    setRates(prev => {
      const removed = prev.find(r => r.id === id);
      if (removed) {
        trackOnboarding('onboarding_rate_removed', {
          basis: removed.basis,
          had_amount: removed.amount > 0,
        });
      }
      return prev.filter(r => r.id !== id);
    });
  };

  const addRate = (basis: RateBasis) => {
    setRates(prev => {
      const existingInBasis = prev.filter(r => r.basis === basis);
      const nextOrder = existingInBasis.length;
      return [...prev, newBlankRate(basis, nextOrder)];
    });
    trackOnboarding('onboarding_rate_added', { basis });
  };

  const dailyRates = rates.filter(r => r.basis === 'daily').sort((a, b) => a.sort_order - b.sort_order);
  const hourlyRates = rates.filter(r => r.basis === 'hourly').sort((a, b) => a.sort_order - b.sort_order);

  const showDaily = preference === 'per_day';
  const showHourly = preference === 'per_hour';

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground font-[Manrope]">
          Let's set up how you get paid
        </h2>
        <p className="text-muted-foreground">
          Choose your usual billing style and create reusable default rates. You can always
          customize rates for each clinic later.
        </p>
      </div>

      {/* Existing-user banner: backfill or skip (non-destructive) */}
      {bannerActive && existingClinicRates && existingClinicRates.length > 0 && (
        <Card className="border-primary/30 bg-primary/[0.04]">
          <CardContent className="py-4 px-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <Wand2 className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  We found {existingClinicRates.length} rate{existingClinicRates.length === 1 ? '' : 's'} on your existing clinics
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Use them to seed your reusable Rate Card — your clinic-specific rates won't change.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleBackfillFromClinics}
                className="gap-1.5"
              >
                <Wand2 className="h-3.5 w-3.5" /> Use my clinic rates
              </Button>
              {onSkip && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    trackOnboarding('onboarding_rate_card_skipped' as any, {
                      had_existing_clinic_rates: true,
                    });
                    onSkip();
                  }}
                  className="gap-1.5 text-muted-foreground"
                >
                  <SkipForward className="h-3.5 w-3.5" /> Skip for now
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setBannerActive(false)}
                className="text-muted-foreground"
              >
                No thanks
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing preference grid */}
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
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30 shadow-sm'
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

      {/* Rate sections */}
      {(showDaily || showHourly) && (
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
                showHeader={preference === 'both'}
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
                showHeader={preference === 'both'}
              />
            )}
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground text-center">
        You can always override or add clinic-specific rates later.
      </p>
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
  showHeader: boolean;
}

function RateSection({ title, basis, rates, onUpdate, onRemove, onAdd, showHeader }: RateSectionProps) {
  return (
    <div className="space-y-3">
      {showHeader && (
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </Label>
      )}
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
