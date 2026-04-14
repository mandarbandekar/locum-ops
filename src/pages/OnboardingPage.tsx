import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { ArrowRight, Check, MapPin, Mail, User, Lightbulb, Pencil, Plus } from 'lucide-react';
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

const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern' },
  { value: 'America/Chicago', label: 'Central' },
  { value: 'America/Denver', label: 'Mountain' },
  { value: 'America/Phoenix', label: 'Arizona' },
  { value: 'America/Los_Angeles', label: 'Pacific' },
  { value: 'America/Anchorage', label: 'Alaska' },
  { value: 'Pacific/Honolulu', label: 'Hawaii' },
];

function getTimezoneLabel(tz: string): string {
  return TIMEZONE_OPTIONS.find(o => o.value === tz)?.label || tz;
}

export default function OnboardingPage() {
  const { profile, updateProfile, completeOnboarding } = useUserProfile();
  const { user } = useAuth();
  const { facilities, shifts, terms, invoices, lineItems, addShift } = useData();
  const navigate = useNavigate();

  const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [phase, setPhase] = useState<Phase>('manual_facility');
  const [timezone, setTimezone] = useState(profile?.timezone || detectedTimezone);
  const [editingTimezone, setEditingTimezone] = useState(false);
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [lastShiftRate, setLastShiftRate] = useState<number | null>(null);
  const [showClinicForm, setShowClinicForm] = useState(false);

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

  useEffect(() => {
    if (timezone !== detectedTimezone) {
      updateProfile({ timezone });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timezone]);

  const goBack = () => {
    const prev = PHASE_BACK[phase];
    if (prev) setPhase(prev);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const getSkipHandler = (): (() => void) | undefined => {
    if (phase === 'manual_facility' && !showClinicForm) return () => setPhase('finish');
    if (phase === 'first_shift') return () => setPhase('tax_enablement');
    return undefined;
  };

  const getSkipLabel = (): string => {
    if (phase === 'manual_facility') return "Skip — I'll add clinics later";
    if (phase === 'first_shift') return 'Skip for now';
    return 'Skip';
  };

  const renderContent = () => {
    switch (phase) {
      case 'manual_facility':
        return (
          <div className="space-y-5">
            {/* Inline greeting bar */}
            <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg px-3 py-2">
              <span className="text-foreground">
                Hi{firstName ? ` ${firstName}` : ''}!
              </span>
              <span className="text-muted-foreground">
                Timezone: {getTimezoneLabel(timezone)}
              </span>
              {!editingTimezone ? (
                <button
                  type="button"
                  onClick={() => setEditingTimezone(true)}
                  className="text-primary hover:underline text-xs flex items-center gap-0.5"
                >
                  <Pencil className="h-3 w-3" /> Change
                </button>
              ) : (
                <Select value={timezone} onValueChange={v => { setTimezone(v); setEditingTimezone(false); }}>
                  <SelectTrigger className="h-7 w-32 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONE_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <h2 className="text-2xl font-bold text-foreground font-[Manrope]">Add a clinic you work with</h2>
              <p className="text-muted-foreground mt-1">
                Start with one clinic you work with regularly. LocumOps keeps your rates, contacts, and billing terms organized per clinic — so everything's in one place when you need it.
              </p>
            </div>

            {/* Show saved clinic cards */}
            {facilities.length > 0 && !showClinicForm && (
              <div className="space-y-3">
                {facilities.map(f => (
                  <Card key={f.id} className="border-primary/30 bg-primary/[0.03]">
                    <CardContent className="py-4 px-4 space-y-2">
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

                <div className="space-y-2">
                  <Button onClick={() => setPhase('first_shift')} className="w-full" size="lg">
                    Log your first shift <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <button
                    type="button"
                    onClick={() => setShowClinicForm(true)}
                    className="w-full text-sm text-primary hover:underline py-1"
                  >
                    <Plus className="h-3.5 w-3.5 inline mr-1" />Add another clinic
                  </button>
                </div>

                {/* Tip */}
                <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                  <Lightbulb className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span>The day rate you set here becomes the default when you log shifts — saves you from re-entering it every time.</span>
                </div>
              </div>
            )}

            {/* Inline clinic form — shown when no facilities or when adding */}
            {(facilities.length === 0 || showClinicForm) && (
              <OnboardingClinicForm
                onSaved={() => setShowClinicForm(false)}
              />
            )}

            {/* Skip link when showing form */}
            {(facilities.length === 0 || showClinicForm) && (
              <button
                type="button"
                onClick={() => setPhase('finish')}
                className="w-full text-sm text-muted-foreground hover:text-foreground py-1 text-center"
              >
                Skip — I'll add clinics later
              </button>
            )}
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
      onSkip={phase !== 'finish' ? getSkipHandler() : undefined}
      skipLabel={getSkipLabel()}
    >
      {renderContent()}
    </OnboardingLayout>
  );
}
