import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useUserProfile, type Profession, type CurrentTool, type FacilitiesCountBand, type InvoicesPerMonthBand } from '@/contexts/UserProfileContext';
import { ArrowRight, Check, SkipForward } from 'lucide-react';
import { SetupAssistantLanes } from '@/components/setup-assistant/SetupAssistantLanes';
import { ImportReviewPanel } from '@/components/setup-assistant/ImportReviewPanel';
import { SetupSummary } from '@/components/setup-assistant/SetupSummary';
import { useSetupAssistant } from '@/hooks/useSetupAssistant';
import { useManualSetup } from '@/hooks/useManualSetup';
import { SetupChoiceScreen } from '@/components/onboarding/SetupChoiceScreen';
import { ManualFacilityForm } from '@/components/onboarding/ManualFacilityForm';
import { ManualShiftForm } from '@/components/onboarding/ManualShiftForm';
import { ManualExpandScreen } from '@/components/onboarding/ManualExpandScreen';
import { WorkspaceReady } from '@/components/onboarding/WorkspaceReady';

const WIZARD_STEPS = 2; // Profile, Workflow (shown in progress bar)

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
  | 'wizard'        // Steps 1-2
  | 'tax_enablement' // Estimated tax opt-in
  | 'setup_choice'  // Choose import or manual
  | 'import'        // Import assistant path
  | 'import_review' // Review imported entities
  | 'manual_facility' // Manual: add facility
  | 'manual_shift'    // Manual: add shift
  | 'manual_expand'   // Manual: add more or finish
  | 'manual_review'   // Manual: confirm before finalizing
  | 'workspace_ready'; // Final screen

export default function OnboardingPage() {
  const { profile, updateProfile, completeOnboarding } = useUserProfile();
  const navigate = useNavigate();
  const [wizardStep, setWizardStep] = useState(1);
  const [phase, setPhase] = useState<Phase>('wizard');
  const setupAssistant = useSetupAssistant();
  const manualSetup = useManualSetup();

  // Step 1 state
  const [profession, setProfession] = useState<Profession>(profile?.profession || 'other');
  const [workStyle, setWorkStyle] = useState(profile?.work_style_label || '');
  const [timezone, setTimezone] = useState(profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [currency, setCurrency] = useState(profile?.currency || 'USD');

  // Step 2 state
  const [currentTools, setCurrentTools] = useState<CurrentTool[]>(profile?.current_tools || []);
  const [facilitiesBand, setFacilitiesBand] = useState<FacilitiesCountBand>(profile?.facilities_count_band || 'band_1_3');
  const [invoicesBand, setInvoicesBand] = useState<InvoicesPerMonthBand>(profile?.invoices_per_month_band || 'inv_1_3');




  // Tax opt-in
  const [showTaxSetup, setShowTaxSetup] = useState(false);
  const [taxDisclaimer, setTaxDisclaimer] = useState(false);

  // Track last added facility rate for prefilling shift form
  const [lastFacilityRate, setLastFacilityRate] = useState<number | undefined>();

  useEffect(() => {
    console.log('onboarding_step_view', { wizardStep, phase });
  }, [wizardStep, phase]);

  const saveStep1 = async () => {
    console.log('onboarding_step_submit', { step: 1 });
    await updateProfile({ profession, work_style_label: workStyle, timezone, currency });
    setWizardStep(2);
  };

  const saveStep2 = async () => {
    console.log('onboarding_step_submit', { step: 2 });
    await updateProfile({ current_tools: currentTools, facilities_count_band: facilitiesBand, invoices_per_month_band: invoicesBand });
    setPhase('tax_enablement');
  };

  const toggleTool = (tool: CurrentTool) => {
    setCurrentTools(prev => prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool]);
  };

  const toggleTermsField = (field: keyof TermsFieldsEnabled) => {
    setTermsFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

  // ─── Import path handlers ────────────────────────────────
  const handleImportComplete = () => { setPhase('import_review'); };

  const handleImportReviewComplete = async () => {
    await completeOnboarding();
    const summary = setupAssistant.getSummary();
    if (summary.facilities_imported > 0 || summary.shifts_imported > 0) {
      setPhase('workspace_ready');
    } else {
      // Nothing was actually confirmed, go to manual path
      setPhase('manual_facility');
    }
  };

  const handleSkipImport = () => { setPhase('manual_facility'); };

  // ─── Manual path handlers ───────────────────────────────
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

  const handleManualFinish = () => {
    setPhase('manual_review');
  };

  const handleManualConfirm = async () => {
    await completeOnboarding();
    setPhase('workspace_ready');
  };

  const handleNavigate = (path: string) => {
    console.log('onboarding_navigate', { path });
    navigate(path);
  };

  // ─── Render phases ──────────────────────────────────────

  // Tax enablement
  if (phase === 'tax_enablement') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-6">
          <Card>
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <span className="text-xl">📊</span>
              </div>
              <CardTitle className="text-xl">Track estimated taxes</CardTitle>
              <CardDescription className="text-base">
                Stay organized for quarterly payments. LocumOps helps you track set-asides and deadlines — not tax advice, just better prep for your accountant.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!showTaxSetup ? (
                <div className="space-y-3">
                  <Button onClick={() => setShowTaxSetup(true)} className="w-full" size="lg">
                    Enable Tax Tracker
                  </Button>
                  <Button variant="ghost" onClick={() => setPhase('setup_choice')} className="w-full text-muted-foreground">
                    Skip for now
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
                  <Button onClick={() => setPhase('setup_choice')} className="w-full" disabled={!taxDisclaimer}>
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Setup choice
  if (phase === 'setup_choice') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <SetupChoiceScreen
            currentTools={currentTools}
            onChooseImport={() => setPhase('import')}
            onChooseManual={() => setPhase('manual_facility')}
          />
        </div>
      </div>
    );
  }

  // Import assistant
  if (phase === 'import') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <SetupAssistantLanes
            onComplete={handleImportComplete}
            onSkip={handleSkipImport}
            hookState={setupAssistant}
          />
        </div>
      </div>
    );
  }

  // Import review
  if (phase === 'import_review') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <ImportReviewPanel
            entities={setupAssistant.entities}
            onUpdateEntity={setupAssistant.updateEntityStatus}
            onBulkConfirm={setupAssistant.bulkConfirm}
            onComplete={handleImportReviewComplete}
            onBack={() => setPhase('import')}
          />
        </div>
      </div>
    );
  }

  // Manual: add facility
  if (phase === 'manual_facility') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <ManualFacilityForm onSave={handleFacilitySaved} saving={manualSetup.saving} />
        </div>
      </div>
    );
  }

  // Manual: add shift
  if (phase === 'manual_shift') {
    const lastFacility = manualSetup.facilities[manualSetup.facilities.length - 1];
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <ManualShiftForm
            facilities={manualSetup.facilities}
            defaultFacilityId={lastFacility?.id}
            defaultRate={lastFacilityRate}
            onSave={handleShiftSaved}
            saving={manualSetup.saving}
          />
        </div>
      </div>
    );
  }

  // Manual: expand (add more or finish)
  if (phase === 'manual_expand') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <ManualExpandScreen
            facilities={manualSetup.facilities}
            shifts={manualSetup.shifts}
            onAddPractice={() => setPhase('manual_facility')}
            onAddShift={() => setPhase('manual_shift')}
            onFinish={handleManualFinish}
          />
        </div>
      </div>
    );
  }

  // Manual review / confirmation
  if (phase === 'manual_review') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Review your setup</h1>
            <p className="text-muted-foreground">Here's what we'll create for you.</p>
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
          <Button onClick={handleManualConfirm} className="w-full">
            Confirm and finish setup
          </Button>
        </div>
      </div>
    );
  }

  // Workspace ready
  if (phase === 'workspace_ready') {
    const facilitiesCount = manualSetup.facilities.length || setupAssistant.getSummary().facilities_imported;
    const shiftsCount = manualSetup.shifts.length || setupAssistant.getSummary().shifts_imported;
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <WorkspaceReady
            facilitiesCount={facilitiesCount}
            shiftsCount={shiftsCount}
            onNavigate={handleNavigate}
          />
        </div>
      </div>
    );
  }

  // ─── Wizard steps 1–3 ──────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Step {wizardStep} of {WIZARD_STEPS}</span>
          </div>
          <Progress value={(wizardStep / WIZARD_STEPS) * 100} className="h-2" />
        </div>

        {/* Step 1: Profile */}
        {wizardStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Tell us who you are</CardTitle>
              <CardDescription>Helps us personalize your experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <p className="text-xs text-muted-foreground mt-1">Used only to personalize templates and exports. Not financial advice.</p>
              </div>
              <div>
                <Label>Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">Eastern (America/New_York)</SelectItem>
                    <SelectItem value="America/Chicago">Central (America/Chicago)</SelectItem>
                    <SelectItem value="America/Denver">Mountain (America/Denver)</SelectItem>
                    <SelectItem value="America/Phoenix">Arizona (America/Phoenix)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific (America/Los_Angeles)</SelectItem>
                    <SelectItem value="America/Anchorage">Alaska (America/Anchorage)</SelectItem>
                    <SelectItem value="Pacific/Honolulu">Hawaii (Pacific/Honolulu)</SelectItem>
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
              <Button onClick={saveStep1} className="w-full">
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Workflow */}
        {wizardStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>How do you run your ops today?</CardTitle>
              <CardDescription>Helps us understand your workflow</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="mb-2 block">Current tools (select all that apply)</Label>
                <div className="space-y-2">
                  {TOOL_OPTIONS.map(t => (
                    <label key={t.value} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={currentTools.includes(t.value)} onCheckedChange={() => toggleTool(t.value)} />
                      <span className="text-sm">{t.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label className="mb-2 block"># of facilities you work with</Label>
                <RadioGroup value={facilitiesBand} onValueChange={v => setFacilitiesBand(v as FacilitiesCountBand)}>
                  <div className="flex items-center gap-2"><RadioGroupItem value="band_1_3" id="f1" /><Label htmlFor="f1">1–3</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="band_4_8" id="f2" /><Label htmlFor="f2">4–8</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="band_9_plus" id="f3" /><Label htmlFor="f3">9+</Label></div>
                </RadioGroup>
              </div>
              <div>
                <Label className="mb-2 block">Avg invoices per month</Label>
                <RadioGroup value={invoicesBand} onValueChange={v => setInvoicesBand(v as InvoicesPerMonthBand)}>
                  <div className="flex items-center gap-2"><RadioGroupItem value="inv_1_3" id="i1" /><Label htmlFor="i1">1–3</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="inv_4_10" id="i2" /><Label htmlFor="i2">4–10</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="inv_11_plus" id="i3" /><Label htmlFor="i3">11+</Label></div>
                </RadioGroup>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setWizardStep(1)} className="flex-1">Back</Button>
                <Button onClick={saveStep2} className="flex-1">Continue <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        )}



      </div>
    </div>
  );
}
