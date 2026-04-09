import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { ArrowRight, Check, Building2, CalendarDays, Plus, MapPin, DollarSign, Mail, User, Lightbulb } from 'lucide-react';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { WorkspaceReady } from '@/components/onboarding/WorkspaceReady';
import { AddFacilityDialog } from '@/components/AddFacilityDialog';
import { ShiftFormDialog } from '@/components/schedule/ShiftFormDialog';
import { CalendarSyncStep } from '@/components/onboarding/CalendarSyncStep';

type Phase =
  | 'profile'
  | 'manual_facility'
  | 'first_shift'
  | 'tax_enablement'
  | 'calendar_sync'
  | 'workspace_ready';

const PHASE_STEP: Record<Phase, number> = {
  profile: 1,
  manual_facility: 2,
  first_shift: 3,
  tax_enablement: 4,
  calendar_sync: 5,
  workspace_ready: 5,
};

const TOTAL_STEPS = 5;

const PHASE_LABEL: Record<Phase, string> = {
  profile: 'Your profile',
  manual_facility: 'Add a clinic',
  first_shift: 'Log a shift',
  tax_enablement: 'Tax tracking',
  calendar_sync: 'Calendar sync',
  workspace_ready: 'All done!',
};

const PHASE_BACK: Record<Phase, Phase | null> = {
  profile: null,
  manual_facility: 'profile',
  first_shift: 'manual_facility',
  tax_enablement: 'first_shift',
  calendar_sync: 'tax_enablement',
  workspace_ready: null,
};

export default function OnboardingPage() {
  const { profile, updateProfile, completeOnboarding } = useUserProfile();
  const { user } = useAuth();
  const { facilities, shifts, terms, addShift } = useData();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('profile');

  // Dialog open states
  const [facilityDialogOpen, setFacilityDialogOpen] = useState(false);
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);

  // Profile state
  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [timezone, setTimezone] = useState(profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Tax opt-in
  const [showTaxSetup, setShowTaxSetup] = useState(false);
  const [taxDisclaimer, setTaxDisclaimer] = useState(false);

  // Auto-advance for profile
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [userEdited, setUserEdited] = useState(false);

  // Track facility count at time of entering manual_facility to detect new adds
  const [facilitySavedInStep, setFacilitySavedInStep] = useState(false);

  const userEmail = user?.email || '';

  // Pre-fill from auth metadata
  useEffect(() => {
    if (user?.user_metadata) {
      const meta = user.user_metadata;
      if (!firstName && meta.first_name) setFirstName(meta.first_name);
      if (!lastName && meta.last_name) setLastName(meta.last_name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    console.log('onboarding_step_view', { phase });
  }, [phase]);

  // Auto-advance for profile step when all fields pre-filled from OAuth
  useEffect(() => {
    if (phase === 'profile' && !userEdited) {
      const allFilled = firstName.trim() && lastName.trim() && userEmail && timezone;
      if (allFilled) {
        setShowWelcome(true);
        autoAdvanceRef.current = setTimeout(() => {
          saveProfile();
        }, 1500);
      }
    }
    return () => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, firstName, lastName, userEmail, timezone, userEdited]);

  const cancelAutoAdvance = () => {
    setUserEdited(true);
    setShowWelcome(false);
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
  };

  // When entering first_shift phase, open the dialog automatically
  useEffect(() => {
    if (phase === 'first_shift' && shifts.length === 0) {
      setShiftDialogOpen(true);
    }
  }, [phase, shifts.length]);

  const handleFacilityDialogChange = (open: boolean) => {
    setFacilityDialogOpen(open);
    if (!open && phase === 'manual_facility') {
      // Mark that a facility was saved if count increased
      setTimeout(() => {
        if (facilities.length > 0) {
          setFacilitySavedInStep(true);
        }
      }, 300);
    }
  };

  const handleShiftDialogChange = (open: boolean) => {
    setShiftDialogOpen(open);
    // Don't auto-advance; user sees results inline
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

  const handleSkipToApp = async () => {
    await completeOnboarding();
    setPhase('workspace_ready');
  };

  const handleFinishSetup = async () => {
    await completeOnboarding();
    setPhase('workspace_ready');
  };

  const handleNavigate = (path: string) => {
    console.log('onboarding_navigate', { path });
    navigate(path);
  };

  const getSkipHandler = (): (() => void) | undefined => {
    if (phase === 'manual_facility') return () => setPhase('calendar_sync');
    if (phase === 'first_shift') return () => setPhase('tax_enablement');
    if (phase === 'tax_enablement') return () => setPhase('calendar_sync');
    if (phase === 'calendar_sync') return handleFinishSetup;
    return undefined;
  };

  const getSkipLabel = (): string => {
    if (phase === 'manual_facility') return 'Skip — I\'ll add clinics later';
    if (phase === 'first_shift') return 'Skip for now';
    if (phase === 'tax_enablement') return 'Skip for now';
    if (phase === 'calendar_sync') return 'Skip for now';
    return 'Skip';
  };

  const profileAllFilled = !!(firstName.trim() && lastName.trim() && userEmail && timezone);

  const renderContent = () => {
    switch (phase) {
      case 'profile':
        return (
          <div className="space-y-5">
            <div>
              {showWelcome && !userEdited ? (
                <>
                  <h2 className="text-2xl font-bold text-foreground font-[Manrope]">Welcome, {firstName}! 👋</h2>
                  <p className="text-muted-foreground mt-1">We pulled your info from sign-up. Confirm and let's go.</p>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-foreground font-[Manrope]">Welcome to LocumOps!</h2>
                  <p className="text-muted-foreground mt-1">Quick confirmation — this info helps personalize your workspace.</p>
                </>
              )}
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>First name <span className="text-destructive">*</span></Label>
                  <Input
                    value={firstName}
                    onChange={e => { setFirstName(e.target.value); cancelAutoAdvance(); }}
                    placeholder="Jane"
                  />
                </div>
                <div>
                  <Label>Last name <span className="text-destructive">*</span></Label>
                  <Input
                    value={lastName}
                    onChange={e => { setLastName(e.target.value); cancelAutoAdvance(); }}
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
                <Select value={timezone} onValueChange={v => { setTimezone(v); cancelAutoAdvance(); }}>
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
          </div>
        );

      case 'manual_facility':
        return (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-foreground font-[Manrope]">Add a clinic you work with</h2>
              <p className="text-muted-foreground mt-1">
                Start with the one from your most recent shift. You can always add more later.
              </p>
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

            <AddFacilityDialog open={facilityDialogOpen} onOpenChange={handleFacilityDialogChange} />
          </div>
        );

      case 'first_shift':
        return (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-foreground font-[Manrope]">Log your first shift</h2>
              <p className="text-muted-foreground mt-1">
                Add an upcoming or recent shift — invoices are auto-generated from booked shifts.
              </p>
            </div>

            {/* Summary of what's been added so far */}
            {(facilities.length > 0 || shifts.length > 0) && (
              <Card>
                <CardContent className="pt-5 space-y-4">
                  {facilities.length > 0 && (
                    <div>
                      <h3 className="font-medium text-xs text-muted-foreground uppercase tracking-wider mb-2">Practices</h3>
                      <div className="space-y-2">
                        {facilities.map(f => (
                          <div key={f.id} className="flex items-center gap-3 py-1.5 px-3 rounded-md bg-muted/50">
                            <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
                              <Building2 className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <span className="text-sm font-medium">{f.name}</span>
                            <Check className="h-4 w-4 text-primary ml-auto" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {shifts.length > 0 && (
                    <div>
                      <h3 className="font-medium text-xs text-muted-foreground uppercase tracking-wider mb-2">Shifts</h3>
                      <div className="space-y-2">
                        {shifts.map(s => {
                          const facility = facilities.find(f => f.id === s.facility_id);
                          const date = new Date(s.start_datetime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                          const startTime = new Date(s.start_datetime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                          const endTime = new Date(s.end_datetime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                          return (
                            <div key={s.id} className="flex items-center gap-3 py-1.5 px-3 rounded-md bg-muted/50">
                              <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
                                <CalendarDays className="h-3.5 w-3.5 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <span className="text-sm font-medium">{facility?.name}</span>
                                <p className="text-xs text-muted-foreground">{date} · {startTime} – {endTime}</p>
                              </div>
                              <Check className="h-4 w-4 text-primary ml-auto" />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Action buttons */}
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start h-auto py-3 px-4" onClick={() => setShiftDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                <CalendarDays className="mr-2 h-4 w-4 text-primary" />
                {shifts.length === 0 ? 'Add a shift' : 'Add another shift'}
              </Button>
              <Button variant="outline" className="w-full justify-start h-auto py-3 px-4" onClick={() => setFacilityDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                <Building2 className="mr-2 h-4 w-4 text-primary" />
                Add another practice
              </Button>
            </div>

            <Button onClick={() => setPhase('tax_enablement')} className="w-full" size="lg">
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <ShiftFormDialog
              open={shiftDialogOpen}
              onOpenChange={handleShiftDialogChange}
              facilities={facilities}
              shifts={shifts}
              terms={terms}
              onSave={async (shift) => {
                await addShift(shift);
              }}
            />
            <AddFacilityDialog open={facilityDialogOpen} onOpenChange={(open) => setFacilityDialogOpen(open)} />
          </div>
        );

      case 'tax_enablement':
        return (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-foreground font-[Manrope]">Track estimated taxes</h2>
              <p className="text-muted-foreground mt-1">
                Stay organized for quarterly payments — not tax advice, just better prep for your accountant.
              </p>
            </div>
            {!showTaxSetup ? (
              <div className="space-y-3">
                <Button onClick={() => setShowTaxSetup(true)} className="w-full" size="lg">
                  Enable Tax Tracker
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-border bg-muted/50">
                  <Checkbox checked={taxDisclaimer} onCheckedChange={v => setTaxDisclaimer(!!v)} className="mt-0.5" />
                  <span className="text-sm text-muted-foreground">I understand LocumOps does not provide tax, legal, or financial advice. I'll confirm due dates and amounts with my accountant.</span>
                </label>
                {taxDisclaimer && (
                  <p className="text-sm text-primary flex items-center gap-1.5 justify-center">
                    <Check className="h-4 w-4" /> Tax tracker enabled
                  </p>
                )}
                <Button onClick={() => setPhase('calendar_sync')} className="w-full" size="lg" disabled={!taxDisclaimer}>
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        );

      case 'calendar_sync':
        return (
          <CalendarSyncStep onContinue={handleFinishSetup} />
        );

      case 'workspace_ready':
        return (
          <WorkspaceReady
            facilitiesCount={facilities.length}
            shiftsCount={shifts.length}
            onNavigate={handleNavigate}
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
