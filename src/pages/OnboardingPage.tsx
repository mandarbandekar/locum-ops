import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { ArrowRight, Check, MapPin, LayoutDashboard, Pencil, RefreshCw } from 'lucide-react';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { OnboardingRateCard } from '@/components/onboarding/OnboardingRateCard';
import { OnboardingBulkShiftCalendar } from '@/components/onboarding/OnboardingBulkShiftCalendar';
import { OnboardingInvoiceReveal } from '@/components/onboarding/OnboardingInvoiceReveal';
import { AddClinicStepper, type AddClinicStepperHandle } from '@/components/facilities/AddClinicStepper';
import { mapDefaultRatesToRateEntries, type DefaultRate, type BillingPreference } from '@/lib/onboardingRateMapping';
import { toast } from 'sonner';

type Phase = 'rate_card' | 'add_clinic' | 'bulk_shifts' | 'invoice_reveal';

const PHASE_STEP: Record<Phase, number> = {
  rate_card: 1,
  add_clinic: 2,
  bulk_shifts: 3,
  invoice_reveal: 4,
};
const TOTAL_STEPS = 4;
const PHASE_LABEL: Record<Phase, string> = {
  rate_card: 'Set up your rates',
  add_clinic: 'Add your first clinic',
  bulk_shifts: 'Add your shifts',
  invoice_reveal: 'See your invoices',
};
const PHASE_BACK: Record<Phase, Phase | null> = {
  rate_card: null,
  add_clinic: 'rate_card',
  bulk_shifts: 'add_clinic',
  invoice_reveal: 'bulk_shifts',
};

const US_TIMEZONES = new Set([
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix',
  'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu',
]);
function normalizeTimezone(tz: string): string {
  return US_TIMEZONES.has(tz) ? tz : 'America/New_York';
}

export default function OnboardingPage() {
  const { profile, updateProfile, completeOnboarding } = useUserProfile();
  const { user } = useAuth();
  const { facilities, shifts } = useData();
  const navigate = useNavigate();

  const detectedTimezone = normalizeTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);

  const [phase, setPhase] = useState<Phase>('rate_card');

  // ── Rate card session state ──
  const [defaultRates, setDefaultRates] = useState<DefaultRate[]>(profile?.default_rates ?? []);
  const [defaultBillingPreference, setDefaultBillingPreference] =
    useState<BillingPreference>(profile?.default_billing_preference ?? 'per_day');

  // Hydrate when profile loads (in case onboarding is resumed)
  useEffect(() => {
    if (profile?.default_rates && profile.default_rates.length > 0) {
      setDefaultRates(profile.default_rates);
    }
    if (profile?.default_billing_preference) {
      setDefaultBillingPreference(profile.default_billing_preference);
    }
  }, [profile?.default_rates, profile?.default_billing_preference]);

  // ── Add clinic session state ──
  const [firstFacilityId, setFirstFacilityId] = useState<string | null>(null);
  const [editingClinic, setEditingClinic] = useState(false);
  const stepperRef = useRef<AddClinicStepperHandle>(null);
  const [, setFooterTick] = useState(0);
  useEffect(() => {
    if (phase !== 'add_clinic') return;
    const id = window.setInterval(() => setFooterTick(t => t + 1), 200);
    return () => window.clearInterval(id);
  }, [phase]);

  // ── Bulk shifts session state ──
  const [sessionShiftIds, setSessionShiftIds] = useState<string[]>([]);

  // Auto-save profile on mount (silently apply detected timezone)
  const profileSavedRef = useRef(false);
  useEffect(() => {
    if (profileSavedRef.current) return;
    profileSavedRef.current = true;
    const meta = user?.user_metadata || {};
    updateProfile({
      first_name: meta.first_name || profile?.first_name || '',
      last_name: meta.last_name || profile?.last_name || '',
      timezone: detectedTimezone,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    console.log('onboarding_step_view', { phase });
  }, [phase]);

  const goBack = () => {
    const prev = PHASE_BACK[phase];
    if (prev) setPhase(prev);
  };

  // Resolve the active facility (first session-created clinic, fallback to most recent)
  const activeFacility = useMemo(() => {
    if (firstFacilityId) return facilities.find(f => f.id === firstFacilityId) ?? null;
    return facilities[0] ?? null;
  }, [facilities, firstFacilityId]);

  // Map rate card → RateEntry[] for the stepper
  const stepperDefaultRates = useMemo(
    () => mapDefaultRatesToRateEntries(defaultRates),
    [defaultRates],
  );

  // ─────────────────────────── Handlers ───────────────────────────
  const handleRateCardContinue = async () => {
    // Normalize sort_order and persist
    const cleaned = defaultRates
      .filter(r => r.name.trim() && r.amount > 0)
      .map((r, i) => ({ ...r, sort_order: i }));
    if (cleaned.length === 0) {
      toast.error('Add at least one rate to continue');
      return;
    }
    await updateProfile({
      default_rates: cleaned,
      default_billing_preference: defaultBillingPreference,
    });
    setDefaultRates(cleaned);
    setPhase('add_clinic');
  };

  const handleClinicSaved = (facilityId: string) => {
    setFirstFacilityId(facilityId);
    setEditingClinic(false);
    setPhase('bulk_shifts');
  };

  const handleShiftsCreated = (newIds: string[]) => {
    setSessionShiftIds(prev => [...prev, ...newIds]);
  };

  const handleAdvanceToInvoiceReveal = () => {
    setPhase('invoice_reveal');
  };

  const handleFinish = async () => {
    await completeOnboarding();
    navigate('/');
  };

  // ─────────────────────────── Footer renderer ───────────────────────────
  const renderStickyFooter = (): React.ReactNode => {
    switch (phase) {
      case 'rate_card':
        return (
          <Button onClick={handleRateCardContinue} className="w-full h-12" size="lg">
            Continue <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        );

      case 'add_clinic': {
        // If a facility is already saved this session and we're not in edit mode, show Continue.
        if (firstFacilityId && !editingClinic) {
          return (
            <>
              <Button onClick={() => setPhase('bulk_shifts')} className="w-full h-12" size="lg">
                Continue → Add shifts <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <button
                type="button"
                onClick={goBack}
                className="w-full text-sm text-muted-foreground hover:text-foreground py-1 text-center"
              >
                ← Back
              </button>
            </>
          );
        }
        const handle = stepperRef.current;
        const primaryLabel = handle?.primaryLabel ?? 'Continue';
        const canBack = !!handle?.canBack;
        return (
          <>
            <Button
              className="w-full h-12"
              size="lg"
              onClick={() => stepperRef.current?.next()}
              disabled={!handle}
            >
              {primaryLabel} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <div className="flex items-center justify-between text-sm">
              {canBack ? (
                <button
                  type="button"
                  onClick={() => stepperRef.current?.back()}
                  className="text-muted-foreground hover:text-foreground py-1"
                >
                  ← Back
                </button>
              ) : (
                <button
                  type="button"
                  onClick={goBack}
                  className="text-muted-foreground hover:text-foreground py-1"
                >
                  ← Back to rates
                </button>
              )}
              <span />
            </div>
          </>
        );
      }

      case 'bulk_shifts':
        // Footer is rendered by the OnboardingBulkShiftCalendar via render-prop.
        return null;

      case 'invoice_reveal':
        return (
          <>
            <Button onClick={handleFinish} className="w-full h-12" size="lg">
              <LayoutDashboard className="mr-2 h-5 w-5" /> Take me to my dashboard
            </Button>
            <button
              type="button"
              onClick={goBack}
              className="w-full text-sm text-muted-foreground hover:text-foreground py-1 text-center"
            >
              ← Back
            </button>
          </>
        );
    }
  };

  // ─────────────────────────── Content renderer ───────────────────────────
  const renderContent = () => {
    switch (phase) {
      case 'rate_card':
        return (
          <OnboardingRateCard
            initialRates={defaultRates}
            initialPreference={defaultBillingPreference}
            onChange={(rates, pref) => {
              setDefaultRates(rates);
              setDefaultBillingPreference(pref);
            }}
          />
        );

      case 'add_clinic':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground font-[Manrope]">
                Add your first clinic
              </h2>
              <p className="text-muted-foreground">
                Just the basics — we'll auto-apply the rates you just set up. You can always
                edit clinic-specific details later.
              </p>
            </div>

            {firstFacilityId && !editingClinic && activeFacility ? (
              <Card className="border-primary/30 bg-primary/[0.04]">
                <CardContent className="py-4 px-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground text-base">{activeFacility.name}</p>
                      {activeFacility.address && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3.5 w-3.5 shrink-0" /> {activeFacility.address}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="border-primary/40 text-primary shrink-0">
                      <Check className="h-3 w-3 mr-1" /> Saved
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingClinic(true)}
                      className="gap-1.5"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFirstFacilityId(null);
                        setEditingClinic(false);
                      }}
                      className="gap-1.5 text-muted-foreground"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Replace with a different clinic
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <AddClinicStepper
                ref={stepperRef}
                showHeader
                hideRatesStep
                defaultRates={stepperDefaultRates}
                onSaved={handleClinicSaved}
              />
            )}
          </div>
        );

      case 'bulk_shifts':
        if (!activeFacility) {
          return (
            <div className="space-y-3">
              <p className="text-muted-foreground">No clinic found. Go back and add one.</p>
              <Button variant="outline" onClick={() => setPhase('add_clinic')}>
                ← Back to add clinic
              </Button>
            </div>
          );
        }
        return (
          <OnboardingBulkShiftCalendar
            facility={activeFacility}
            defaultRates={defaultRates}
            createdShiftIds={sessionShiftIds}
            onShiftsCreated={handleShiftsCreated}
            onContinue={handleAdvanceToInvoiceReveal}
            renderFooter={(footer) => (
              <div className="shrink-0 border-t border-border/50 bg-background px-4 pt-3 pb-4 fixed bottom-0 left-0 right-0">
                <div className="w-full max-w-[680px] mx-auto space-y-2">
                  <Button
                    onClick={footer.onPrimary}
                    disabled={footer.primaryDisabled}
                    className="w-full h-12"
                    size="lg"
                  >
                    {footer.primaryLabel} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <button
                    type="button"
                    onClick={goBack}
                    className="w-full text-sm text-muted-foreground hover:text-foreground py-1 text-center"
                  >
                    ← Back
                  </button>
                </div>
              </div>
            )}
          />
        );

      case 'invoice_reveal':
        return (
          <OnboardingInvoiceReveal
            facility={activeFacility}
            sessionShiftIds={sessionShiftIds}
          />
        );
    }
  };

  return (
    <OnboardingLayout
      step={PHASE_STEP[phase]}
      totalSteps={TOTAL_STEPS}
      stepLabel={PHASE_LABEL[phase]}
      onBack={PHASE_BACK[phase] ? goBack : undefined}
      stickyFooter={renderStickyFooter()}
    >
      {renderContent()}
    </OnboardingLayout>
  );
}
