import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useUserProfile, type Profession, type CurrentTool, type FacilitiesCountBand, type InvoicesPerMonthBand } from '@/contexts/UserProfileContext';
import { useData } from '@/contexts/DataContext';
import { ArrowRight, Check } from 'lucide-react';
import { SetupAssistantLanes } from '@/components/setup-assistant/SetupAssistantLanes';
import { ImportReviewPanel } from '@/components/setup-assistant/ImportReviewPanel';
import { useSetupAssistant } from '@/hooks/useSetupAssistant';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { SetupChoiceScreen } from '@/components/onboarding/SetupChoiceScreen';
import { ManualExpandScreen } from '@/components/onboarding/ManualExpandScreen';
import { WorkspaceReady } from '@/components/onboarding/WorkspaceReady';
import { AddFacilityDialog } from '@/components/AddFacilityDialog';
import { ShiftFormDialog } from '@/components/schedule/ShiftFormDialog';

const PROFESSIONS: { value: Profession; label: string }[] = [
  { value: 'vet', label: 'Veterinarian' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'physician', label: 'Physician' },
  { value: 'pharmacist', label: 'Pharmacist' },
  { value: 'pt_ot', label: 'PT / OT' },
  { value: 'other', label: 'Other' },
];

const WORK_STYLES = [
  'Independent contractor (1099)',
  'S-Corp',
  'W-2 per diem',
  'Mix',
];

const TOOL_OPTIONS: { value: CurrentTool; label: string }[] = [
  { value: 'sheets_excel', label: 'Google Sheets / Excel' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'quickbooks', label: 'QuickBooks' },
  { value: 'wave', label: 'Wave' },
  { value: 'freshbooks', label: 'FreshBooks' },
  { value: 'notes', label: 'Notes' },
  { value: 'other', label: 'Other' },
];

type Phase =
  | 'profile'
  | 'workflow'
  | 'tax_enablement'
  | 'setup_choice'
  | 'import'
  | 'import_review'
  | 'manual_facility'
  | 'manual_shift'
  | 'manual_expand'
  | 'manual_review'
  | 'workspace_ready';

const PHASE_STEP: Record<Phase, number> = {
  profile: 1,
  workflow: 2,
  tax_enablement: 3,
  setup_choice: 4,
  import: 5,
  import_review: 6,
  manual_facility: 5,
  manual_shift: 6,
  manual_expand: 7,
  manual_review: 7,
  workspace_ready: 8,
};

const TOTAL_STEPS = 8;

const PHASE_LABEL: Record<Phase, string> = {
  profile: 'Tell us about yourself',
  workflow: 'Your current workflow',
  tax_enablement: 'Tax tracking',
  setup_choice: 'Choose your setup path',
  import: 'Import your data',
  import_review: 'Review imported data',
  manual_facility: 'Add a practice',
  manual_shift: 'Add a shift',
  manual_expand: 'Add more or finish',
  manual_review: 'Review your setup',
  workspace_ready: 'All done!',
};

const PHASE_BACK: Record<Phase, Phase | null> = {
  profile: null,
  workflow: 'profile',
  tax_enablement: 'workflow',
  setup_choice: 'tax_enablement',
  import: 'setup_choice',
  import_review: 'import',
  manual_facility: 'setup_choice',
  manual_shift: 'manual_facility',
  manual_expand: 'manual_shift',
  manual_review: 'manual_expand',
  workspace_ready: null,
};

export default function OnboardingPage() {
  const { profile, updateProfile, completeOnboarding } = useUserProfile();
  const { facilities, shifts, terms, addShift } = useData();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('profile');
  const setupAssistant = useSetupAssistant();

  // Track facilities/shifts count at phase entry to detect new additions
  const [facilityCountAtEntry, setFacilityCountAtEntry] = useState(0);
  const [shiftCountAtEntry, setShiftCountAtEntry] = useState(0);

  // Dialog open states
  const [facilityDialogOpen, setFacilityDialogOpen] = useState(false);
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);

  // Profile state — pre-populated from signup metadata via UserProfileContext
  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [companyName, setCompanyName] = useState(profile?.company_name || '');
  const [companyAddress, setCompanyAddress] = useState(profile?.company_address || '');
  const [invoiceEmail, setInvoiceEmail] = useState(profile?.invoice_email || '');
  const [invoicePhone, setInvoicePhone] = useState(profile?.invoice_phone || '');
  const [profession, setProfession] = useState<Profession>(profile?.profession || 'other');
  const [workStyle, setWorkStyle] = useState(profile?.work_style_label || '');
  const [timezone, setTimezone] = useState(profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [currency, setCurrency] = useState(profile?.currency || 'USD');

  // Workflow state
  const [currentTools, setCurrentTools] = useState<CurrentTool[]>(profile?.current_tools || []);
  const [facilitiesBand, setFacilitiesBand] = useState<FacilitiesCountBand>(profile?.facilities_count_band || 'band_1_3');
  const [invoicesBand, setInvoicesBand] = useState<InvoicesPerMonthBand>(profile?.invoices_per_month_band || 'inv_1_3');

  // Tax opt-in
  const [showTaxSetup, setShowTaxSetup] = useState(false);
  const [taxDisclaimer, setTaxDisclaimer] = useState(false);

  useEffect(() => {
    console.log('onboarding_step_view', { phase });
  }, [phase]);

  // When entering manual_facility phase, open the dialog automatically
  useEffect(() => {
    if (phase === 'manual_facility') {
      setFacilityCountAtEntry(facilities.length);
      setFacilityDialogOpen(true);
    }
  }, [phase]);

  // When entering manual_shift phase, open the dialog automatically
  useEffect(() => {
    if (phase === 'manual_shift') {
      setShiftCountAtEntry(shifts.length);
      setShiftDialogOpen(true);
    }
  }, [phase]);

  // When facility dialog closes, check if a facility was added
  const handleFacilityDialogChange = (open: boolean) => {
    setFacilityDialogOpen(open);
    if (!open && phase === 'manual_facility') {
      // Check if new facilities were added (DataContext will have updated)
      setTimeout(() => {
        // Use a small delay to let DataContext state propagate
        setPhase('manual_shift');
      }, 300);
    }
  };

  // When shift dialog closes, check if a shift was added
  const handleShiftDialogChange = (open: boolean) => {
    setShiftDialogOpen(open);
    if (!open && phase === 'manual_shift') {
      setTimeout(() => {
        setPhase('manual_expand');
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
      company_name: companyName.trim(),
      company_address: companyAddress.trim(),
      invoice_email: invoiceEmail.trim() || null,
      invoice_phone: invoicePhone.trim() || null,
      profession,
      work_style_label: workStyle,
      timezone,
      currency,
    });
    setPhase('workflow');
  };

  const saveWorkflow = async () => {
    console.log('onboarding_step_submit', { step: 'workflow' });
    await updateProfile({ current_tools: currentTools, facilities_count_band: facilitiesBand, invoices_per_month_band: invoicesBand });
    setPhase('tax_enablement');
  };

  const toggleTool = (tool: CurrentTool) => {
    setCurrentTools(prev => prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool]);
  };

  const handleSkipToApp = async () => {
    await completeOnboarding();
    setPhase('workspace_ready');
  };

  // Import handlers
  const handleImportComplete = () => setPhase('import_review');
  const handleImportReviewComplete = async () => {
    await completeOnboarding();
    const summary = setupAssistant.getSummary();
    if (summary.facilities_imported > 0 || summary.shifts_imported > 0) {
      setPhase('workspace_ready');
    } else {
      setPhase('manual_facility');
    }
  };

  const handleManualConfirm = async () => {
    await completeOnboarding();
    setPhase('workspace_ready');
  };

  const handleNavigate = (path: string) => {
    console.log('onboarding_navigate', { path });
    navigate(path);
  };

  // Determine skip handler for current phase
  const getSkipHandler = (): (() => void) | undefined => {
    if (phase === 'manual_facility' || phase === 'manual_shift') return handleSkipToApp;
    if (phase === 'tax_enablement') return () => setPhase('setup_choice');
    return undefined;
  };

  const getSkipLabel = (): string => {
    if (phase === 'manual_facility' || phase === 'manual_shift') return 'Skip to dashboard';
    if (phase === 'tax_enablement') return 'Skip for now';
    return 'Skip';
  };

  // Shift save handler for ShiftFormDialog
  const handleShiftSave = (shift: any) => {
    // ShiftFormDialog calls onSave but the actual addShift is in DataContext
    // The dialog handles its own save via the form submit
  };

  // Render content based on phase
  const renderContent = () => {
    switch (phase) {
      case 'profile':
        return (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-foreground font-[Manrope]">Welcome to LocumOps!</h2>
              <p className="text-muted-foreground mt-1">Tell us about your business — this info will appear on your invoices.</p>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Work style</Label>
                  <Select value={workStyle} onValueChange={setWorkStyle}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {WORK_STYLES.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
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
              <div>
                <Label>Company / practice name</Label>
                <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Smith Veterinary Services LLC" />
                <p className="text-xs text-muted-foreground mt-1">Appears as the sender on your invoices.</p>
              </div>
              <div>
                <Label>Business address</Label>
                <Input value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} placeholder="100 Main St, Suite 200, Portland, OR 97201" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Contact email</Label>
                  <Input type="email" value={invoiceEmail} onChange={e => setInvoiceEmail(e.target.value)} placeholder="jane@example.com" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={invoicePhone} onChange={e => setInvoicePhone(e.target.value)} placeholder="503-555-1234" />
                </div>
              </div>
              <div>
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="AUD">AUD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={saveProfile} className="w-full" size="lg">
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );

      case 'workflow':
        return (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-foreground font-[Manrope]">How do you run your ops today?</h2>
              <p className="text-muted-foreground mt-1">Helps us understand your workflow.</p>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="mb-2 block">Current tools (select all that apply)</Label>
                <div className="grid grid-cols-2 gap-2">
                  {TOOL_OPTIONS.map(t => (
                    <label key={t.value} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                      <Checkbox checked={currentTools.includes(t.value)} onCheckedChange={() => toggleTool(t.value)} />
                      <span className="text-sm">{t.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block text-sm"># of facilities</Label>
                  <RadioGroup value={facilitiesBand} onValueChange={v => setFacilitiesBand(v as FacilitiesCountBand)}>
                    <div className="flex items-center gap-2"><RadioGroupItem value="band_1_3" id="f1" /><Label htmlFor="f1">1–3</Label></div>
                    <div className="flex items-center gap-2"><RadioGroupItem value="band_4_8" id="f2" /><Label htmlFor="f2">4–8</Label></div>
                    <div className="flex items-center gap-2"><RadioGroupItem value="band_9_plus" id="f3" /><Label htmlFor="f3">9+</Label></div>
                  </RadioGroup>
                </div>
                <div>
                  <Label className="mb-2 block text-sm">Invoices / month</Label>
                  <RadioGroup value={invoicesBand} onValueChange={v => setInvoicesBand(v as InvoicesPerMonthBand)}>
                    <div className="flex items-center gap-2"><RadioGroupItem value="inv_1_3" id="i1" /><Label htmlFor="i1">1–3</Label></div>
                    <div className="flex items-center gap-2"><RadioGroupItem value="inv_4_10" id="i2" /><Label htmlFor="i2">4–10</Label></div>
                    <div className="flex items-center gap-2"><RadioGroupItem value="inv_11_plus" id="i3" /><Label htmlFor="i3">11+</Label></div>
                  </RadioGroup>
                </div>
              </div>
            </div>
            <Button onClick={saveWorkflow} className="w-full" size="lg">
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
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
                <Button onClick={() => setPhase('setup_choice')} className="w-full" size="lg" disabled={!taxDisclaimer}>
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        );

      case 'setup_choice':
        return (
          <SetupChoiceScreen
            currentTools={currentTools}
            onChooseImport={() => setPhase('import')}
            onChooseManual={() => setPhase('manual_facility')}
          />
        );

      case 'import':
        return (
          <SetupAssistantLanes
            onComplete={handleImportComplete}
            onSkip={() => setPhase('manual_facility')}
            hookState={setupAssistant}
          />
        );

      case 'import_review':
        return (
          <ImportReviewPanel
            entities={setupAssistant.entities}
            onUpdateEntity={setupAssistant.updateEntityStatus}
            onBulkConfirm={setupAssistant.bulkConfirm}
            onComplete={handleImportReviewComplete}
            onBack={() => setPhase('import')}
          />
        );

      case 'manual_facility':
        return (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-foreground font-[Manrope]">Add your first practice</h2>
              <p className="text-muted-foreground mt-1">
                Start with one place you work so we can organize your schedule and billing.
              </p>
            </div>
            <Button onClick={() => setFacilityDialogOpen(true)} className="w-full" size="lg">
              Open Practice Form <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            {facilities.length > 0 && (
              <Card>
                <CardContent className="pt-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Added practices</p>
                  {facilities.map(f => (
                    <div key={f.id} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      <span>{f.name}</span>
                    </div>
                  ))}
                  <Button onClick={() => setPhase('manual_shift')} className="w-full mt-3" size="lg">
                    Continue to shifts <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )}
            <AddFacilityDialog open={facilityDialogOpen} onOpenChange={handleFacilityDialogChange} />
          </div>
        );

      case 'manual_shift':
        return (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-foreground font-[Manrope]">Add your first shift</h2>
              <p className="text-muted-foreground mt-1">
                Add an upcoming shift so your schedule is ready right away.
              </p>
            </div>
            <Button onClick={() => setShiftDialogOpen(true)} className="w-full" size="lg">
              Open Shift Form <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            {shifts.length > 0 && (
              <Card>
                <CardContent className="pt-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Added shifts</p>
                  {shifts.map(s => {
                    const facility = facilities.find(f => f.id === s.facility_id);
                    const date = new Date(s.start_datetime).toLocaleDateString();
                    return (
                      <div key={s.id} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary" />
                        <span>{facility?.name} — {date}</span>
                      </div>
                    );
                  })}
                  <Button onClick={() => setPhase('manual_expand')} className="w-full mt-3" size="lg">
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )}
            <ShiftFormDialog
              open={shiftDialogOpen}
              onOpenChange={handleShiftDialogChange}
              facilities={facilities}
              shifts={shifts}
              terms={terms}
              onSave={(shift) => {
                addShift(shift);
              }}
            />
          </div>
        );

      case 'manual_expand':
        return (
          <ManualExpandScreen
            facilities={facilities}
            shifts={shifts}
            onAddPractice={() => setPhase('manual_facility')}
            onAddShift={() => setPhase('manual_shift')}
            onFinish={() => setPhase('manual_review')}
          />
        );

      case 'manual_review':
        return (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-foreground font-[Manrope]">Review your setup</h2>
              <p className="text-muted-foreground mt-1">Here's what we'll create for you.</p>
            </div>
            <Card>
              <CardContent className="pt-5 space-y-4">
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-2">Practices</h3>
                  {facilities.map(f => (
                    <div key={f.id} className="flex items-center gap-2 py-1">
                      <Check className="h-4 w-4 text-primary" />
                      <span className="text-sm">{f.name}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-2">Shifts</h3>
                  {shifts.map(s => {
                    const facility = facilities.find(f => f.id === s.facility_id);
                    const date = new Date(s.start_datetime).toLocaleDateString();
                    return (
                      <div key={s.id} className="flex items-center gap-2 py-1">
                        <Check className="h-4 w-4 text-primary" />
                        <span className="text-sm">{facility?.name} — {date}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            <Button onClick={handleManualConfirm} className="w-full" size="lg">
              Confirm and finish setup
            </Button>
          </div>
        );

      case 'workspace_ready':
        return (
          <WorkspaceReady
            facilitiesCount={facilities.length || setupAssistant.getSummary().facilities_imported}
            shiftsCount={shifts.length || setupAssistant.getSummary().shifts_imported}
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
