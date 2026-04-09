import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { ArrowRight, Check, Building2, Plus, MapPin, Mail, User, Lightbulb } from 'lucide-react';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { AddFacilityDialog } from '@/components/AddFacilityDialog';
import { OnboardingShiftStep } from '@/components/onboarding/OnboardingShiftStep';
import { OnboardingTaxStep } from '@/components/onboarding/OnboardingTaxStep';
import { WorkspaceReady } from '@/components/onboarding/WorkspaceReady';

type Phase =
  | 'profile'
  | 'manual_facility'
  | 'first_shift'
  | 'tax_enablement'
  | 'calendar_sync';

const PHASE_STEP: Record<Phase, number> = {
  profile: 1,
  manual_facility: 2,
  first_shift: 3,
  tax_enablement: 4,
  calendar_sync: 5,
};

const TOTAL_STEPS = 5;

const PHASE_LABEL: Record<Phase, string> = {
  profile: 'Your profile',
  manual_facility: 'Add a clinic',
  first_shift: 'Log a shift',
  tax_enablement: 'Tax tracking',
  calendar_sync: 'Finish up',
};

const PHASE_BACK: Record<Phase, Phase | null> = {
  profile: null,
  manual_facility: 'profile',
  first_shift: 'manual_facility',
  tax_enablement: 'first_shift',
  calendar_sync: 'tax_enablement',
};

export default function OnboardingPage() {
  const { profile, updateProfile, completeOnboarding } = useUserProfile();
  const { user } = useAuth();
  const { facilities, shifts, terms, invoices, lineItems, addShift } = useData();
  const navigate = useNavigate();

  // OAuth skip logic
  const isOAuth = user?.app_metadata?.provider === 'google';
  const oauthFirstName = user?.user_metadata?.first_name || '';
  const oauthLastName = user?.user_metadata?.last_name || '';
  const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const canSkipProfile = isOAuth && oauthFirstName && oauthLastName && (user?.email || '');

  const [phase, setPhase] = useState<Phase>(canSkipProfile ? 'manual_facility' : 'profile');
  const [skippedProfileViaOAuth] = useState(canSkipProfile);

  // Dialog open states
  const [facilityDialogOpen, setFacilityDialogOpen] = useState(false);

  // Profile state
  const [firstName, setFirstName] = useState(profile?.first_name || oauthFirstName);
  const [lastName, setLastName] = useState(profile?.last_name || oauthLastName);
  const [timezone, setTimezone] = useState(profile?.timezone || detectedTimezone);

  // Tax state
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [lastShiftRate, setLastShiftRate] = useState<number | null>(null);

  const userEmail = user?.email || '';

  // Track facility saved in step
  const [facilitySavedInStep, setFacilitySavedInStep] = useState(false);

  // Pre-fill from auth metadata (non-OAuth)
  useEffect(() => {
    if (!isOAuth && user?.user_metadata) {
      const meta = user.user_metadata;
      if (!firstName && meta.first_name) setFirstName(meta.first_name);
      if (!lastName && meta.last_name) setLastName(meta.last_name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    console.log('onboarding_step_view', { phase });
  }, [phase]);

  // Silently save profile for OAuth users who skipped Step 1
  const profileSavedRef = useRef(false);
  useEffect(() => {
    if (skippedProfileViaOAuth && !profileSavedRef.current) {
      profileSavedRef.current = true;
      updateProfile({
        first_name: oauthFirstName,
        last_name: oauthLastName,
        timezone: detectedTimezone,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track shift rate when shifts change
  useEffect(() => {
    if (shifts.length > 0 && !lastShiftRate) {
      setLastShiftRate(shifts[shifts.length - 1].rate_applied);
    }
  }, [shifts, lastShiftRate]);

  const handleFacilityDialogChange = (open: boolean) => {
    setFacilityDialogOpen(open);
    if (!open && phase === 'manual_facility') {
      setTimeout(() => {
        if (facilities.length > 0) {
          setFacilitySavedInStep(true);
        }
      }, 300);
    }
  };

  const goBack = () => {
    const prev = PHASE_BACK[phase];
    if (prev) setPhase(prev);
  };

  const saveProfile = async () => {
    console.log('onboarding_step_submit', { step: 'profile' });
    await updateProfile({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      timezone,
    });
    setPhase('manual_facility');
  };

  const handleNavigate = (path: string) => {
    console.log('onboarding_navigate', { path });
    navigate(path);
  };

  const getSkipHandler = (): (() => void) | undefined => {
    if (phase === 'manual_facility') return () => setPhase('calendar_sync');
    if (phase === 'first_shift') return () => setPhase('tax_enablement');
    if (phase === 'tax_enablement') return () => setPhase('calendar_sync');
    if (phase === 'calendar_sync') return undefined; // handled inside WorkspaceReady
    return undefined;
  };

  const getSkipLabel = (): string => {
    if (phase === 'manual_facility') return "Skip — I'll add clinics later";
    if (phase === 'first_shift') return 'Skip for now';
    if (phase === 'tax_enablement') return 'Skip for now';
    return 'Skip';
  };

  const profileAllFilled = !!(firstName.trim() && lastName.trim() && userEmail && timezone);

  const renderContent = () => {
    switch (phase) {
      case 'profile':
        return (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-foreground font-[Manrope]">Welcome to LocumOps!</h2>
              <p className="text-muted-foreground mt-1">Quick confirmation — this info helps personalize your workspace.</p>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>First name <span className="text-destructive">*</span></Label>
                  <Input
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="Jane"
                  />
                </div>
                <div>
                  <Label>Last name <span className="text-destructive">*</span></Label>
                  <Input
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Smith"
                  />
                </div>
              </div>
              <div>
                <Label>Email</Label>
                <Input value={userEmail} disabled className="bg-muted/50 text-muted-foreground" />
              </div>
              <div>
                <Label>Timezone</Label>
                <Select value={timezone} onValueChange={v => setTimezone(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">Eastern</SelectItem>
                    <SelectItem value="America/Chicago">Central</SelectItem>
                    <SelectItem value="America/Denver">Mountain</SelectItem>
                    <SelectItem value="America/Phoenix">Arizona</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific</SelectItem>
                    <SelectItem value="America/Anchorage">Alaska</SelectItem>
                    <SelectItem value="Pacific/Honolulu">Hawaii</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={saveProfile}
              className="w-full"
              size="lg"
              disabled={!firstName.trim() || !lastName.trim()}
            >
              {profileAllFilled ? "Looks good, let's go" : 'Continue'} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            {/* What is LocumOps? */}
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">What LocumOps does for you</p>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> Centralize your clinics, shifts, and invoices in one place</li>
                  <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> Auto-generate invoices when you log shifts</li>
                  <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> Track taxes and credentials so nothing slips through the cracks</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        );

      case 'manual_facility':
        return (
          <div className="space-y-5">
            <div>
              {skippedProfileViaOAuth ? (
                <>
                  <h2 className="text-2xl font-bold text-foreground font-[Manrope]">Welcome, {firstName}! 👋</h2>
                  <p className="text-muted-foreground mt-1">
                    Let's set up your workspace — start by adding a clinic you work with.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-foreground font-[Manrope]">Add a clinic you work with</h2>
                  <p className="text-muted-foreground mt-1">
                    Start with the one from your most recent shift. You can always add more later.
                  </p>
                </>
              )}
            </div>

            {/* Show saved clinic cards */}
            {facilities.length > 0 && (
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
              </div>
            )}

            {/* Show form prompt or add-more option */}
            {facilities.length === 0 ? (
              <Card className="border-dashed border-2 border-primary/20 bg-primary/[0.02] hover:border-primary/40 transition-colors cursor-pointer" onClick={() => setFacilityDialogOpen(true)}>
                <CardContent className="py-8 flex flex-col items-center gap-3 text-center">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Add a practice</p>
                    <p className="text-sm text-muted-foreground mt-0.5">Clinic name, address, contact info, and rates</p>
                  </div>
                  <Button size="sm" className="mt-1">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Practice
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                <Button onClick={() => setPhase('first_shift')} className="w-full" size="lg">
                  Log your first shift <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <button
                  type="button"
                  onClick={() => setFacilityDialogOpen(true)}
                  className="w-full text-sm text-primary hover:underline py-1"
                >
                  + Add another clinic
                </button>
              </div>
            )}

            {/* Tip */}
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
              <Lightbulb className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
              <span>The day rate you set here becomes the default when you log shifts — saves you from re-entering it every time.</span>
            </div>

            {/* Why add clinics? */}
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Why add clinics?</p>
                <p className="text-sm text-muted-foreground">
                  Each clinic you add becomes a billing entity. When you log shifts at this clinic, LocumOps auto-generates invoices, tracks payments, and builds your earnings reports — no spreadsheets needed.
                </p>
              </CardContent>
            </Card>

            <AddFacilityDialog open={facilityDialogOpen} onOpenChange={handleFacilityDialogChange} />
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
              setPhase('calendar_sync');
            }}
          />
        );

      case 'calendar_sync':
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
      onSkip={getSkipHandler()}
      skipLabel={getSkipLabel()}
    >
      {renderContent()}
    </OnboardingLayout>
  );
}
