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
import { ArrowRight, Check, Building2, CalendarDays, Plus, MapPin } from 'lucide-react';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { WorkspaceReady } from '@/components/onboarding/WorkspaceReady';
import { AddFacilityDialog } from '@/components/AddFacilityDialog';
import { ShiftFormDialog } from '@/components/schedule/ShiftFormDialog';

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
  | 'manual_facility'
  | 'manual_shift'
  | 'manual_expand'
  | 'workspace_ready';

const PHASE_STEP: Record<Phase, number> = {
  profile: 1,
  workflow: 2,
  tax_enablement: 3,
  manual_facility: 4,
  manual_shift: 5,
  manual_expand: 6,
  workspace_ready: 6,
};

const TOTAL_STEPS = 6;

const PHASE_LABEL: Record<Phase, string> = {
  profile: 'Your business details',
  workflow: 'Your current workflow',
  tax_enablement: 'Tax tracking',
  manual_facility: 'Add a practice',
  manual_shift: 'Add a shift',
  manual_expand: 'Review & finish',
  workspace_ready: 'All done!',
};

const PHASE_BACK: Record<Phase, Phase | null> = {
  profile: null,
  workflow: 'profile',
  tax_enablement: 'workflow',
  manual_facility: 'tax_enablement',
  manual_shift: 'manual_facility',
  manual_expand: 'manual_shift',
  workspace_ready: null,
};

export default function OnboardingPage() {
  const { profile, updateProfile, completeOnboarding } = useUserProfile();
  const { facilities, shifts, terms, addShift } = useData();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('profile');

  // Dialog open states
  const [facilityDialogOpen, setFacilityDialogOpen] = useState(false);
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);

  // Profile state
  const [companyName, setCompanyName] = useState(profile?.company_name || '');
  const [companyAddress, setCompanyAddress] = useState(profile?.company_address || '');
  const [invoiceEmail, setInvoiceEmail] = useState(profile?.invoice_email || '');
  const [invoicePhone, setInvoicePhone] = useState(profile?.invoice_phone || '');
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
      setFacilityDialogOpen(true);
    }
  }, [phase]);

  // When entering manual_shift phase, open the dialog automatically
  useEffect(() => {
    if (phase === 'manual_shift') {
      setShiftDialogOpen(true);
    }
  }, [phase]);

  const handleFacilityDialogChange = (open: boolean) => {
    setFacilityDialogOpen(open);
    if (!open && phase === 'manual_facility') {
      setTimeout(() => {
        if (facilities.length > 0) {
          setPhase('manual_shift');
        }
      }, 300);
    }
  };

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
      company_name: companyName.trim(),
      company_address: companyAddress.trim(),
      invoice_email: invoiceEmail.trim() || null,
      invoice_phone: invoicePhone.trim() || null,
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

  const handleFinishSetup = async () => {
    await completeOnboarding();
    setPhase('workspace_ready');
  };

  const handleNavigate = (path: string) => {
    console.log('onboarding_navigate', { path });
    navigate(path);
  };

  const getSkipHandler = (): (() => void) | undefined => {
    if (phase === 'manual_facility' || phase === 'manual_shift') return handleSkipToApp;
    if (phase === 'tax_enablement') return () => setPhase('manual_facility');
    return undefined;
  };

  const getSkipLabel = (): string => {
    if (phase === 'manual_facility' || phase === 'manual_shift') return 'Skip to dashboard';
    if (phase === 'tax_enablement') return 'Skip for now';
    return 'Skip';
  };

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
              <h2 className="text-2xl font-bold text-foreground font-[Manrope]">How do you handle admin back office work today?</h2>
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
                <Button onClick={() => setPhase('manual_facility')} className="w-full" size="lg" disabled={!taxDisclaimer}>
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
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
              <div className="space-y-3">
                {facilities.map(f => (
                  <Card key={f.id} className="border-primary/20 bg-primary/[0.02]">
                    <CardContent className="py-3 px-4 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{f.name}</p>
                        {f.address && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3 shrink-0" /> {f.address}
                          </p>
                        )}
                      </div>
                      <Check className="h-4 w-4 text-primary ml-auto shrink-0" />
                    </CardContent>
                  </Card>
                ))}
                <Button variant="outline" className="w-full" onClick={() => setFacilityDialogOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add another practice
                </Button>
                <Button onClick={() => setPhase('manual_shift')} className="w-full" size="lg">
                  Continue to shifts <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
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

            {shifts.length === 0 ? (
              <Card className="border-dashed border-2 border-primary/20 bg-primary/[0.02] hover:border-primary/40 transition-colors cursor-pointer" onClick={() => setShiftDialogOpen(true)}>
                <CardContent className="py-8 flex flex-col items-center gap-3 text-center">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <CalendarDays className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Add a shift</p>
                    <p className="text-sm text-muted-foreground mt-0.5">Date, time, facility, and rate</p>
                  </div>
                  <Button size="sm" className="mt-1">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Shift
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {shifts.map(s => {
                  const facility = facilities.find(f => f.id === s.facility_id);
                  const date = new Date(s.start_datetime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                  const startTime = new Date(s.start_datetime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                  const endTime = new Date(s.end_datetime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                  return (
                    <Card key={s.id} className="border-primary/20 bg-primary/[0.02]">
                      <CardContent className="py-3 px-4 flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <CalendarDays className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">{facility?.name}</p>
                          <p className="text-xs text-muted-foreground">{date} · {startTime} – {endTime}</p>
                        </div>
                        <Check className="h-4 w-4 text-primary ml-auto shrink-0" />
                      </CardContent>
                    </Card>
                  );
                })}
                <Button variant="outline" className="w-full" onClick={() => setShiftDialogOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add another shift
                </Button>
                <Button onClick={() => setPhase('manual_expand')} className="w-full" size="lg">
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
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
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-foreground font-[Manrope]">You're all set!</h2>
              <p className="text-muted-foreground mt-1">Here's what we've added to your workspace. You can add more or finish up.</p>
            </div>

            <Card>
              <CardContent className="pt-5 space-y-4">
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
                <div>
                  <h3 className="font-medium text-xs text-muted-foreground uppercase tracking-wider mb-2">Shifts</h3>
                  <div className="space-y-2">
                    {shifts.map(s => {
                      const facility = facilities.find(f => f.id === s.facility_id);
                      const date = new Date(s.start_datetime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                      return (
                        <div key={s.id} className="flex items-center gap-3 py-1.5 px-3 rounded-md bg-muted/50">
                          <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
                            <CalendarDays className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <span className="text-sm font-medium">{facility?.name} — {date}</span>
                          <Check className="h-4 w-4 text-primary ml-auto" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-auto py-3" onClick={() => setPhase('manual_facility')}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add practice
              </Button>
              <Button variant="outline" className="h-auto py-3" onClick={() => setPhase('manual_shift')}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add shift
              </Button>
            </div>

            <Button onClick={handleFinishSetup} className="w-full" size="lg">
              Finish setup <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
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
