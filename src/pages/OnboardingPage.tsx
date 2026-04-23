import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { ArrowRight, Check, MapPin, Mail, User, Plus, LayoutDashboard } from 'lucide-react';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { OnboardingClinicForm } from '@/components/onboarding/OnboardingClinicForm';
import { OnboardingShiftBuilder } from '@/components/onboarding/OnboardingShiftBuilder';
import { OnboardingInvoiceReveal } from '@/components/onboarding/OnboardingInvoiceReveal';
import { OnboardingFinancialReveal } from '@/components/onboarding/OnboardingFinancialReveal';

type Phase = 'add_clinic' | 'log_shifts' | 'invoice_reveal' | 'financial_reveal';

const PHASE_STEP: Record<Phase, number> = {
  add_clinic: 1,
  log_shifts: 2,
  invoice_reveal: 3,
  financial_reveal: 4,
};

const TOTAL_STEPS = 4;

const PHASE_LABEL: Record<Phase, string> = {
  add_clinic: 'Add a clinic',
  log_shifts: 'Log your shifts',
  invoice_reveal: 'Your first invoice',
  financial_reveal: 'Your financial health',
};

const PHASE_BACK: Record<Phase, Phase | null> = {
  add_clinic: null,
  log_shifts: 'add_clinic',
  invoice_reveal: 'log_shifts',
  financial_reveal: 'invoice_reveal',
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

function normalizeTimezone(tz: string): string {
  return US_TIMEZONES.has(tz) ? tz : 'America/New_York';
}

export default function OnboardingPage() {
  const { profile, updateProfile, completeOnboarding } = useUserProfile();
  const { user } = useAuth();
  const { facilities, shifts, terms, invoices, lineItems, addShift, deleteShift } = useData();
  const navigate = useNavigate();

  const detectedTimezone = normalizeTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);

  const [phase, setPhase] = useState<Phase>('add_clinic');
  const [showClinicForm, setShowClinicForm] = useState(false);
  // Track shifts created during this onboarding session (so we can show only the user's brand-new data).
  const [sessionShiftIds, setSessionShiftIds] = useState<string[]>([]);
  // Tick so the sticky footer re-renders when stepper internal state changes.
  const [, setFooterTick] = useState(0);
  useEffect(() => {
    if (phase !== 'add_clinic' && phase !== 'log_shifts') return;
    const id = window.setInterval(() => setFooterTick(t => t + 1), 200);
    return () => window.clearInterval(id);
  }, [phase]);

  const firstName = profile?.first_name || user?.user_metadata?.first_name || '';

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

  // Silently sync detected timezone if missing
  useEffect(() => {
    if (!profile?.timezone && detectedTimezone) {
      updateProfile({ timezone: detectedTimezone });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.timezone, detectedTimezone]);

  const goBack = () => {
    const prev = PHASE_BACK[phase];
    if (prev) setPhase(prev);
  };

  const sessionShiftCount = sessionShiftIds.filter(id => shifts.some(s => s.id === id)).length;

  const primaryFacility = facilities[0];

  const sender = useMemo(() => ({
    firstName: profile?.first_name || '',
    lastName: profile?.last_name || '',
    company: profile?.company_name || '',
    address: profile?.company_address || '',
    email: profile?.invoice_email || user?.email || null,
    phone: profile?.invoice_phone || null,
  }), [profile, user]);

  const renderStickyFooter = () => {
    switch (phase) {
      case 'add_clinic': {
        if (facilities.length > 0 && !showClinicForm) {
          return (
            <>
              <Button onClick={() => setPhase('log_shifts')} className="w-full h-12" size="lg">
                Continue → Log shifts at {primaryFacility?.name || 'this clinic'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <button
                type="button"
                onClick={() => setShowClinicForm(true)}
                className="w-full text-sm text-muted-foreground hover:text-foreground py-1 text-center"
              >
                <Plus className="h-3.5 w-3.5 inline mr-1" />Add another clinic
              </button>
            </>
          );
        }
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
              {canSkip && (
                <button
                  type="button"
                  onClick={() => skipBtn?.click()}
                  className="text-primary hover:underline py-1"
                >
                  Skip — I'll add this later
                </button>
              )}
            </div>
          </>
        );
      }

      case 'log_shifts': {
        const ctaLabel = sessionShiftCount === 0
          ? 'See my invoice'
          : `See my invoice (${sessionShiftCount} ${sessionShiftCount === 1 ? 'shift' : 'shifts'} logged)`;
        return (
          <>
            <Button
              onClick={() => setPhase('invoice_reveal')}
              disabled={sessionShiftCount === 0}
              className="w-full h-12"
              size="lg"
            >
              {ctaLabel} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <button
              type="button"
              onClick={() => setPhase('invoice_reveal')}
              className="w-full text-sm text-muted-foreground hover:text-foreground py-1 text-center disabled:opacity-50"
              disabled={sessionShiftCount === 0}
            >
              I'll log the rest later
            </button>
          </>
        );
      }

      case 'invoice_reveal':
        return (
          <Button onClick={() => setPhase('financial_reveal')} className="w-full h-12" size="lg">
            Continue → See your dashboard <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        );

      case 'financial_reveal':
        return (
          <Button
            className="w-full h-12"
            size="lg"
            onClick={async () => {
              await completeOnboarding();
              navigate('/');
            }}
          >
            <LayoutDashboard className="mr-2 h-5 w-5" /> Take me to my Dashboard
          </Button>
        );
    }
  };

  const renderContent = () => {
    switch (phase) {
      case 'add_clinic':
        return (
          <div className="space-y-4">
            <div className="text-sm text-foreground">
              Hi{firstName ? ` ${firstName}` : ''}!
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground font-[Manrope]">Add a clinic you work with</h2>
              <p className="text-muted-foreground">
                We'll keep all your rates, billing terms, and contacts in one place — so the second time
                you work here, everything's ready.
              </p>
            </div>

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
                  Next: log shifts you've worked here and watch your first invoice appear.
                </p>
              </div>
            )}

            {(facilities.length === 0 || showClinicForm) && (
              <OnboardingClinicForm onSaved={() => setShowClinicForm(false)} />
            )}
          </div>
        );

      case 'log_shifts':
        return (
          <OnboardingShiftBuilder
            facilities={facilities}
            shifts={shifts}
            terms={terms}
            addShift={addShift}
            deleteShift={deleteShift}
            sessionShiftIds={sessionShiftIds}
            onShiftAdded={(id) => setSessionShiftIds(prev => [...prev, id])}
          />
        );

      case 'invoice_reveal':
        return (
          <OnboardingInvoiceReveal
            facilities={facilities}
            invoices={invoices}
            lineItems={lineItems}
            shifts={shifts}
            sessionShiftIds={sessionShiftIds}
            sender={sender}
          />
        );

      case 'financial_reveal':
        return (
          <OnboardingFinancialReveal
            facilities={facilities}
            invoices={invoices}
            shifts={shifts}
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
