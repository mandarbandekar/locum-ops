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
import { ArrowRight, Check } from 'lucide-react';
import { SetupAssistantLanes } from '@/components/setup-assistant/SetupAssistantLanes';
import { ImportReviewPanel } from '@/components/setup-assistant/ImportReviewPanel';
import { useSetupAssistant } from '@/hooks/useSetupAssistant';
import { useManualSetup } from '@/hooks/useManualSetup';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { SetupChoiceScreen } from '@/components/onboarding/SetupChoiceScreen';
import { ManualFacilityForm } from '@/components/onboarding/ManualFacilityForm';
import { ManualShiftForm } from '@/components/onboarding/ManualShiftForm';
import { ManualExpandScreen } from '@/components/onboarding/ManualExpandScreen';
import { WorkspaceReady } from '@/components/onboarding/WorkspaceReady';

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
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('profile');
  const setupAssistant = useSetupAssistant();
  const manualSetup = useManualSetup();

  // Profile state
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

  // Last facility rate for prefilling
  const [lastFacilityRate, setLastFacilityRate] = useState<number | undefined>();

  useEffect(() => {
    console.log('onboarding_step_view', { phase });
  }, [phase]);

  const goBack = () => {
    const prev = PHASE_BACK[phase];
    if (prev) setPhase(prev);
  };

  const saveProfile = async () => {
    console.log('onboarding_step_submit', { step: 'profile' });
    await updateProfile({ profession, work_style_label: workStyle, timezone, currency });
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

  // Manual handlers
  const handleFacilitySaved = async (input: any) => {
    const facility = await manualSetup.addFacility(input);
    if (facility) {
      setLastFacilityRate(input.weekday_rate);
      setPhase('manual_shift');
    }
  };

  const handleShiftSaved = async (input: any) => {
    const shift = await manualSetup.addShift(input);
    if (shift) {
      setPhase('manual_expand');
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

  // Render content based on phase
  const renderContent = () => {
    switch (phase) {
      case 'profile':
        return (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-foreground font-[Manrope]">Welcome to LocumOps!</h2>
              <p className="text-muted-foreground mt-1">Tell us a bit about yourself to personalize your experience.</p>
            </div>
            <div className="space-y-4">
              <div>
                <Label>Profession</Label>
                <Select value={profession} onValueChange={v => setProfession(v as Profession)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROFESSIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Work style</Label>
                <Select value={workStyle} onValueChange={setWorkStyle}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {WORK_STYLES.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Used to personalize templates and exports.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
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
          <ManualFacilityForm onSave={handleFacilitySaved} saving={manualSetup.saving} />
        );

      case 'manual_shift':
        return (
          <ManualShiftForm
            facilities={manualSetup.facilities}
            defaultFacilityId={manualSetup.facilities[manualSetup.facilities.length - 1]?.id}
            defaultRate={lastFacilityRate}
            onSave={handleShiftSaved}
            saving={manualSetup.saving}
          />
        );

      case 'manual_expand':
        return (
          <ManualExpandScreen
            facilities={manualSetup.facilities}
            shifts={manualSetup.shifts}
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
                  {manualSetup.facilities.map(f => (
                    <div key={f.id} className="flex items-center gap-2 py-1">
                      <Check className="h-4 w-4 text-primary" />
                      <span className="text-sm">{f.name}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-2">Shifts</h3>
                  {manualSetup.shifts.map(s => {
                    const facility = manualSetup.facilities.find(f => f.id === s.facility_id);
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
        const facilitiesCount = manualSetup.facilities.length || setupAssistant.getSummary().facilities_imported;
        const shiftsCount = manualSetup.shifts.length || setupAssistant.getSummary().shifts_imported;
        return (
          <WorkspaceReady
            facilitiesCount={facilitiesCount}
            shiftsCount={shiftsCount}
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
