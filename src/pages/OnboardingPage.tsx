import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// Select removed: timezone is auto-detected silently
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { ArrowRight, Check, MapPin, Mail, User, Plus, LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { OnboardingClinicForm } from '@/components/onboarding/OnboardingClinicForm';
import { OnboardingShiftStep } from '@/components/onboarding/OnboardingShiftStep';
import { OnboardingTaxStep } from '@/components/onboarding/OnboardingTaxStep';
import { WorkspaceReady } from '@/components/onboarding/WorkspaceReady';

type Phase =
  | 'manual_facility'
  | 'first_shift'
  | 'tax_enablement'
  | 'finish';

const PHASE_STEP: Record<Phase, number> = {
  manual_facility: 1,
  first_shift: 2,
  tax_enablement: 3,
  finish: 3,
};

const TOTAL_STEPS = 3;

const PHASE_LABEL: Record<Phase, string> = {
  manual_facility: 'Add a clinic',
  first_shift: 'Log a shift',
  tax_enablement: 'Your taxes',
  finish: 'Your taxes',
};

const PHASE_BACK: Record<Phase, Phase | null> = {
  manual_facility: null,
  first_shift: 'manual_facility',
  tax_enablement: 'first_shift',
  finish: null,
};

const US_TIMEZONES = new Set([
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
]);

const TIMEZONE_LABELS: Record<string, string> = {
  'America/New_York': 'Eastern',
  'America/Chicago': 'Central',
  'America/Denver': 'Mountain',
  'America/Phoenix': 'Arizona',
  'America/Los_Angeles': 'Pacific',
  'America/Anchorage': 'Alaska',
  'Pacific/Honolulu': 'Hawaii',
};

function normalizeTimezone(tz: string): string {
  return US_TIMEZONES.has(tz) ? tz : 'America/New_York';
}

function getTimezoneLabel(tz: string): string {
  return TIMEZONE_LABELS[tz] || tz;
}

export default function OnboardingPage() {
  const { profile, updateProfile, completeOnboarding } = useUserProfile();
  const { user } = useAuth();
  const { facilities, shifts, terms, invoices, lineItems, addShift } = useData();
  const navigate = useNavigate();

  const detectedTimezone = normalizeTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);

  const [phase, setPhase] = useState<Phase>('manual_facility');
  const timezone = profile?.timezone || detectedTimezone;
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [lastShiftRate, setLastShiftRate] = useState<number | null>(null);
  const [showClinicForm, setShowClinicForm] = useState(false);
  const [shiftSubmitted, setShiftSubmitted] = useState(false);
  // Tick so the sticky footer re-renders when stepper internal state changes.
  const [, setFooterTick] = useState(0);
  useEffect(() => {
    if (phase !== 'manual_facility') return;
    const id = window.setInterval(() => setFooterTick(t => t + 1), 200);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const firstName = profile?.first_name || user?.user_metadata?.first_name || '';

  // Auto-save profile on mount
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

  useEffect(() => {
    if (shifts.length > 0 && !lastShiftRate) {
      setLastShiftRate(shifts[shifts.length - 1].rate_applied);
    }
  }, [shifts, lastShiftRate]);

  // Silently sync detected timezone to profile if missing
  useEffect(() => {
    if (!profile?.timezone && detectedTimezone) {
      updateProfile({ timezone: detectedTimezone });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.timezone, detectedTimezone]);

  // Track shift submission state from child
  useEffect(() => {
    const btn = document.getElementById('onboarding-shift-continue');
    setShiftSubmitted(!!btn);
  });

  const goBack = () => {
    const prev = PHASE_BACK[phase];
    if (prev) setPhase(prev);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const renderStickyFooter = () => {
    switch (phase) {
      case 'manual_facility': {
        if (facilities.length > 0 && !showClinicForm) {
          // Clinic saved — show "Log your first shift" as sticky CTA
          return (
            <>
              <Button onClick={() => setPhase('first_shift')} className="w-full h-12" size="lg">
                Log your first shift <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <button
                type="button"
                onClick={() => setShowClinicForm(true)}
                className="w-full text-sm text-primary hover:underline py-1 text-center"
              >
                <Plus className="h-3.5 w-3.5 inline mr-1" />Add another clinic
              </button>
            </>
          );
        }
        // Showing clinic form — drive the stepper's hidden Next/Back/Skip CTAs.
        const saveBtn = document.getElementById('onboarding-clinic-save') as HTMLButtonElement | null;
        const backBtn = document.getElementById('onboarding-clinic-back') as HTMLButtonElement | null;
        const skipBtn = document.getElementById('onboarding-clinic-skip') as HTMLButtonElement | null;
        const isLast = saveBtn?.dataset.isLast === 'true';
        const canBack = backBtn?.dataset.canBack === 'true';
        const canSkip = skipBtn?.dataset.canSkip === 'true';
        const primaryLabel = isLast ? 'Save Clinic' : 'Continue';
        return (
          <>
            <Button
              className="w-full h-12"
              size="lg"
              onClick={() => saveBtn?.click()}
            >
              {primaryLabel} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <div className="flex items-center justify-between text-sm">
              {canBack ? (
                <button
                  type="button"
                  onClick={() => backBtn?.click()}
                  className="text-muted-foreground hover:text-foreground py-1"
                >
                  ← Back
                </button>
              ) : <span />}
              {canSkip ? (
                <button
                  type="button"
                  onClick={() => skipBtn?.click()}
                  className="text-primary hover:underline py-1"
                >
                  Skip — I'll add this later
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setPhase('finish')}
                  className="text-muted-foreground hover:text-foreground py-1"
                >
                  Skip — I'll add clinics later
                </button>
              )}
            </div>
          </>
        );
      }

      case 'first_shift': {
        // Check if shift was submitted (post-shift state)
        const continueBtn = document.getElementById('onboarding-shift-continue');
        if (continueBtn) {
          return (
            <Button onClick={() => setPhase('tax_enablement')} className="w-full h-12" size="lg">
              See my tax estimate <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          );
        }
        // Pre-shift form
        return (
          <>
            <Button
              className="w-full h-12"
              size="lg"
              onClick={() => {
                const btn = document.getElementById('onboarding-shift-save') as HTMLButtonElement;
                btn?.click();
              }}
            >
              Log Shift <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <button
              type="button"
              onClick={() => setPhase('tax_enablement')}
              className="w-full text-sm text-muted-foreground hover:text-foreground py-1 text-center"
            >
              Skip for now
            </button>
          </>
        );
      }

      case 'tax_enablement':
        return (
          <Button
            className="w-full h-12"
            size="lg"
            onClick={() => {
              const btn = document.getElementById('onboarding-tax-finish') as HTMLButtonElement;
              btn?.click();
            }}
          >
            Finish Setup <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        );

      case 'finish':
        return (
          <Button
            className="w-full h-12"
            size="lg"
            onClick={async () => {
              await completeOnboarding();
              navigate('/');
            }}
          >
            <LayoutDashboard className="mr-2 h-5 w-5" /> Go to My Dashboard
          </Button>
        );
    }
  };

  const renderContent = () => {
    switch (phase) {
      case 'manual_facility':
        return (
          <div className="space-y-4">
            {/* Inline greeting */}
            <div className="text-sm text-foreground">
              Hi{firstName ? ` ${firstName}` : ''}!
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground font-[Manrope]">Add a clinic you work with</h2>
              <p className="text-muted-foreground">
                Start with one clinic you work with regularly. LocumOps keeps your rates, contacts, and billing terms organized per clinic — so everything's in one place when you need it.
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground font-[Manrope]">Add a clinic you work with</h2>
              <p className="text-muted-foreground">
                Start with one clinic you work with regularly. LocumOps keeps your rates, contacts, and billing terms organized per clinic — so everything's in one place when you need it.
              </p>
            </div>

            {/* Show saved clinic cards */}
            {facilities.length > 0 && !showClinicForm && (
              <div className="space-y-3">
                {facilities.map(f => (
                  <Card key={f.id} className="border-primary/30 bg-primary/[0.03]">
                    <CardContent className="py-3 px-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground text-base">{f.name}</p>
                          {f.address && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3.5 w-3.5 shrink-0" /> {f.address}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="border-primary/30 text-primary shrink-0 ml-2">
                          <Check className="h-3 w-3 mr-1" /> Added
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {f.invoice_name_to && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" /> {f.invoice_name_to}
                          </span>
                        )}
                        {f.invoice_email_to && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {f.invoice_email_to}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <p className="text-sm text-muted-foreground">
                  Next: log a shift at this clinic and watch your first invoice appear.
                </p>
              </div>
            )}

            {/* Inline clinic form */}
            {(facilities.length === 0 || showClinicForm) && (
              <OnboardingClinicForm
                onSaved={() => setShowClinicForm(false)}
              />
            )}

            <p className="text-xs text-muted-foreground pt-2">
              Detected timezone: {getTimezoneLabel(timezone)}. Wrong?{' '}
              <Link to="/settings/profile" className="text-primary hover:underline">
                Change in Settings
              </Link>
              .
            </p>
          </div>
        );

      case 'first_shift':
        return (
          <OnboardingShiftStep
            facilities={facilities}
            shifts={shifts}
            terms={terms}
            invoices={invoices}
            lineItems={lineItems}
            addShift={addShift}
            onContinue={() => setPhase('tax_enablement')}
          />
        );

      case 'tax_enablement':
        return (
          <OnboardingTaxStep
            shiftRate={lastShiftRate}
            hasShiftData={shifts.length > 0}
            timezone={timezone}
            onContinue={(enabled) => {
              setTaxEnabled(enabled);
              setPhase('finish');
            }}
          />
        );

      case 'finish':
        return (
          <WorkspaceReady
            facilities={facilities}
            shifts={shifts}
            invoices={invoices}
            taxEnabled={taxEnabled}
            shiftRate={lastShiftRate}
            onNavigate={handleNavigate}
            onCompleteOnboarding={completeOnboarding}
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
