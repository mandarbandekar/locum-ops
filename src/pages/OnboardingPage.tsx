import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUserProfile, type OnboardingPhase, type OnboardingProgress } from '@/contexts/UserProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { ArrowRight, Check, MapPin, LayoutDashboard, Pencil, RefreshCw } from 'lucide-react';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { OnboardingRateCard } from '@/components/onboarding/OnboardingRateCard';
import { OnboardingBulkShiftCalendar } from '@/components/onboarding/OnboardingBulkShiftCalendar';
import { OnboardingInvoiceReveal } from '@/components/onboarding/OnboardingInvoiceReveal';
import { OnboardingLoopChoice } from '@/components/onboarding/OnboardingLoopChoice';
import { OnboardingBusinessMap } from '@/components/onboarding/OnboardingBusinessMap';
import { AddClinicStepper, type AddClinicStepperHandle } from '@/components/facilities/AddClinicStepper';
import { mapDefaultRatesToRateEntries, type DefaultRate, type BillingPreference } from '@/lib/onboardingRateMapping';
import { trackOnboarding, maybeTrackActivation } from '@/lib/onboardingAnalytics';
import { toast } from 'sonner';

type Phase = OnboardingPhase;

const PHASE_STEP: Record<Phase, number> = {
  rate_card: 1,
  add_clinic: 2,
  bulk_shifts: 3,
  invoice_reveal: 4,
  loop_choice: 5,
  business_map: 6,
};
const TOTAL_STEPS = 6;
const PHASE_LABEL: Record<Phase, string> = {
  rate_card: 'Set up your rates',
  add_clinic: 'Add your first clinic',
  bulk_shifts: 'Add your shifts',
  invoice_reveal: 'See your invoices',
  loop_choice: "What's next?",
  business_map: 'Your business in one place',
};
const PHASE_BACK: Record<Phase, Phase | null> = {
  rate_card: null,
  add_clinic: 'rate_card',
  bulk_shifts: 'add_clinic',
  invoice_reveal: 'bulk_shifts',
  loop_choice: 'invoice_reveal',
  business_map: 'loop_choice',
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
  const { facilities, shifts, invoices, lineItems } = useData();
  const navigate = useNavigate();

  const detectedTimezone = normalizeTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // ── Hydrate from persisted progress (one-time) ──
  const initialProgress: OnboardingProgress = profile?.onboarding_progress ?? {};
  const [phase, setPhase] = useState<Phase>(initialProgress.phase ?? 'rate_card');

  const [defaultRates, setDefaultRates] = useState<DefaultRate[]>(profile?.default_rates ?? []);
  const [defaultBillingPreference, setDefaultBillingPreference] =
    useState<BillingPreference>(profile?.default_billing_preference ?? 'per_day');

  const [firstFacilityId, setFirstFacilityId] = useState<string | null>(initialProgress.first_facility_id ?? null);
  const [createdFacilityIds, setCreatedFacilityIds] = useState<string[]>(initialProgress.created_facility_ids ?? []);
  const [sessionShiftIds, setSessionShiftIds] = useState<string[]>(initialProgress.session_shift_ids ?? []);
  const [invoiceRevealSeen, setInvoiceRevealSeen] = useState<boolean>(!!initialProgress.invoice_reveal_seen);

  const [editingClinic, setEditingClinic] = useState(false);
  const stepperRef = useRef<AddClinicStepperHandle>(null);
  const [, setFooterTick] = useState(0);
  useEffect(() => {
    if (phase !== 'add_clinic') return;
    const id = window.setInterval(() => setFooterTick(t => t + 1), 200);
    return () => window.clearInterval(id);
  }, [phase]);

  // Re-hydrate when profile arrives later (page first painted before profile loaded)
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current || !profile) return;
    hydratedRef.current = true;
    const p = profile.onboarding_progress ?? {};
    if (profile.default_rates?.length) setDefaultRates(profile.default_rates);
    if (profile.default_billing_preference) setDefaultBillingPreference(profile.default_billing_preference);
    if (p.phase) setPhase(p.phase);
    if (p.first_facility_id !== undefined) setFirstFacilityId(p.first_facility_id);
    if (p.created_facility_ids) setCreatedFacilityIds(p.created_facility_ids);
    if (p.session_shift_ids) setSessionShiftIds(p.session_shift_ids);
    if (p.invoice_reveal_seen) setInvoiceRevealSeen(true);
  }, [profile]);

  // ── Persist progress (debounced lightly via dependency batching) ──
  const persist = useCallback(
    (next: Partial<OnboardingProgress>) => {
      const merged: OnboardingProgress = {
        phase,
        first_facility_id: firstFacilityId,
        created_facility_ids: createdFacilityIds,
        session_shift_ids: sessionShiftIds,
        invoice_reveal_seen: invoiceRevealSeen,
        ...next,
        updated_at: new Date().toISOString(),
      };
      updateProfile({ onboarding_progress: merged });
    },
    [phase, firstFacilityId, createdFacilityIds, sessionShiftIds, invoiceRevealSeen, updateProfile],
  );

  // Auto-save profile timezone on mount
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
    if (phase === 'add_clinic') {
      trackOnboarding('onboarding_clinic_viewed', {
        clinic_count_so_far: createdFacilityIds.length,
        is_first_clinic: createdFacilityIds.length === 0,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const goBack = () => {
    const prev = PHASE_BACK[phase];
    if (prev) {
      setPhase(prev);
      persist({ phase: prev });
    }
  };

  const activeFacility = useMemo(() => {
    if (firstFacilityId) return facilities.find(f => f.id === firstFacilityId) ?? null;
    return facilities[0] ?? null;
  }, [facilities, firstFacilityId]);

  const stepperDefaultRates = useMemo(
    () => mapDefaultRatesToRateEntries(defaultRates),
    [defaultRates],
  );

  // ── Derived counts for loop_choice + business_map ──
  const onboardingFacilityCount = createdFacilityIds.length || (firstFacilityId ? 1 : 0);
  const onboardingShiftCount = sessionShiftIds.length;
  const draftInvoiceCount = useMemo(() => {
    if (sessionShiftIds.length === 0) return 0;
    const sessionSet = new Set(sessionShiftIds);
    return invoices.filter(inv => {
      const items = lineItems.filter(li => li.invoice_id === inv.id);
      return items.some(li => li.shift_id && sessionSet.has(li.shift_id));
    }).length;
  }, [invoices, lineItems, sessionShiftIds]);
  const projectedGross = useMemo(() => {
    if (sessionShiftIds.length === 0) return 0;
    const sessionSet = new Set(sessionShiftIds);
    return shifts
      .filter(s => sessionSet.has(s.id))
      .reduce((sum, s) => sum + (s.rate_applied || 0), 0);
  }, [shifts, sessionShiftIds]);

  // ─────────────────────────── Handlers ───────────────────────────
  const finishingRef = useRef(false);
  const rateCardSubmitRef = useRef(false);

  const handleRateCardContinue = async () => {
    if (rateCardSubmitRef.current) return;
    const cleaned = defaultRates
      .filter(r => r.name.trim() && r.amount > 0)
      .map((r, i) => ({ ...r, sort_order: i }));
    if (cleaned.length === 0) {
      toast.error('Add at least one rate to continue');
      return;
    }
    rateCardSubmitRef.current = true;
    try {
      await updateProfile({
        default_rates: cleaned,
        default_billing_preference: defaultBillingPreference,
      });
      setDefaultRates(cleaned);
      trackOnboarding('onboarding_rate_card_completed', {
        rate_count: cleaned.length,
        preference: defaultBillingPreference,
        daily_rate_count: cleaned.filter(r => r.basis === 'daily').length,
        hourly_rate_count: cleaned.filter(r => r.basis === 'hourly').length,
      });
      setPhase('add_clinic');
      persist({ phase: 'add_clinic' });
    } finally {
      rateCardSubmitRef.current = false;
    }
  };

  const handleClinicSaved = (facilityId: string) => {
    const isNew = !createdFacilityIds.includes(facilityId);
    setFirstFacilityId(facilityId);
    setCreatedFacilityIds(prev => (prev.includes(facilityId) ? prev : [...prev, facilityId]));
    setEditingClinic(false);
    setPhase('bulk_shifts');
    persist({
      phase: 'bulk_shifts',
      first_facility_id: facilityId,
      created_facility_ids: createdFacilityIds.includes(facilityId)
        ? createdFacilityIds
        : [...createdFacilityIds, facilityId],
    });
    trackOnboarding('onboarding_clinic_completed', {
      facility_id: facilityId,
      is_new: isNew,
      clinic_count_so_far: isNew ? createdFacilityIds.length + 1 : createdFacilityIds.length,
    });
  };

  const handleShiftsCreated = (newIds: string[]) => {
    // Defensive de-dupe — guards against repeated callbacks delivering same IDs.
    const merged = Array.from(new Set([...sessionShiftIds, ...newIds]));
    setSessionShiftIds(merged);
    persist({ session_shift_ids: merged });
  };

  const handleAdvanceToInvoiceReveal = () => {
    setPhase('invoice_reveal');
    persist({ phase: 'invoice_reveal' });
  };

  const handleAdvanceToLoopChoice = () => {
    setInvoiceRevealSeen(true);
    setPhase('loop_choice');
    persist({ phase: 'loop_choice', invoice_reveal_seen: true });
    trackOnboarding('onboarding_invoice_continue_clicked', {
      session_shift_count: sessionShiftIds.length,
      draft_invoice_count: draftInvoiceCount,
    });
  };

  // Loop choice actions
  const handleAddAnotherClinic = () => {
    setFirstFacilityId(null);
    setEditingClinic(false);
    setPhase('add_clinic');
    persist({ phase: 'add_clinic', first_facility_id: null });
  };
  const handleAddMoreShifts = () => {
    if (!activeFacility) {
      setPhase('add_clinic');
      persist({ phase: 'add_clinic' });
      return;
    }
    setPhase('bulk_shifts');
    persist({ phase: 'bulk_shifts' });
  };
  const handleDoneToBusinessMap = () => {
    setPhase('business_map');
    persist({ phase: 'business_map' });
  };

  const handleFinish = async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    try {
      await updateProfile({
        onboarding_progress: {
          phase: 'business_map',
          first_facility_id: firstFacilityId,
          created_facility_ids: createdFacilityIds,
          session_shift_ids: sessionShiftIds,
          invoice_reveal_seen: true,
          business_map_seen: true,
          updated_at: new Date().toISOString(),
        },
      });
      await completeOnboarding();
      trackOnboarding('onboarding_completed', {
        clinic_count: onboardingFacilityCount,
        shift_count: onboardingShiftCount,
        draft_invoice_count: draftInvoiceCount,
        projected_gross: Math.round(projectedGross),
      });
      navigate('/');
    } catch (e) {
      finishingRef.current = false;
      console.error('finish onboarding failed', e);
      toast.error('Could not finish onboarding. Please try again.');
    }
  };

  // Activation latch — fires once when criteria are met.
  useEffect(() => {
    maybeTrackActivation({
      rateCardCompleted: (profile?.default_rates?.length ?? 0) > 0,
      clinicCount: onboardingFacilityCount,
      shiftCount: onboardingShiftCount,
      invoiceRevealSeen,
      draftInvoiceCount,
      projectedGross,
    });
  }, [
    profile?.default_rates,
    onboardingFacilityCount,
    onboardingShiftCount,
    invoiceRevealSeen,
    draftInvoiceCount,
    projectedGross,
  ]);


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
        if (firstFacilityId && !editingClinic) {
          return (
            <>
              <Button onClick={() => { setPhase('bulk_shifts'); persist({ phase: 'bulk_shifts' }); }} className="w-full h-12" size="lg">
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
        return null; // rendered by OnboardingBulkShiftCalendar via render-prop

      case 'invoice_reveal':
        return (
          <>
            <Button onClick={handleAdvanceToLoopChoice} className="w-full h-12" size="lg">
              Continue <ArrowRight className="ml-2 h-4 w-4" />
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

      case 'loop_choice':
        return (
          <button
            type="button"
            onClick={goBack}
            className="w-full text-sm text-muted-foreground hover:text-foreground py-1 text-center"
          >
            ← Back to invoices
          </button>
        );

      case 'business_map':
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
                {createdFacilityIds.length > 0 && !firstFacilityId
                  ? 'Add another clinic'
                  : 'Add your first clinic'}
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
              <Button variant="outline" onClick={() => { setPhase('add_clinic'); persist({ phase: 'add_clinic' }); }}>
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

      case 'loop_choice':
        return (
          <OnboardingLoopChoice
            facilityCount={onboardingFacilityCount}
            shiftCount={onboardingShiftCount}
            draftInvoiceCount={draftInvoiceCount}
            projectedGross={projectedGross}
            onAddAnotherClinic={handleAddAnotherClinic}
            onAddMoreShifts={handleAddMoreShifts}
            onDone={handleDoneToBusinessMap}
          />
        );

      case 'business_map':
        return (
          <OnboardingBusinessMap
            facilityCount={onboardingFacilityCount}
            shiftCount={onboardingShiftCount}
            draftInvoiceCount={draftInvoiceCount}
            projectedGross={projectedGross}
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
