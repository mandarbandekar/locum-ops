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
import { useUserProfile, type Profession, type EmailTone, type CurrentTool, type FacilitiesCountBand, type InvoicesPerMonthBand, type TermsFieldsEnabled } from '@/contexts/UserProfileContext';
import { Building2, CalendarDays, FileText, Upload, ArrowRight, Check, SkipForward } from 'lucide-react';

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

const TONES: { value: EmailTone; label: string }[] = [
  { value: 'friendly', label: 'Friendly' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'direct', label: 'Direct' },
];

export default function OnboardingPage() {
  const { profile, updateProfile, completeOnboarding } = useUserProfile();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [showStartingPath, setShowStartingPath] = useState(false);

  // Step 1 state
  const [profession, setProfession] = useState<Profession>(profile?.profession || 'other');
  const [workStyle, setWorkStyle] = useState(profile?.work_style_label || '');
  const [timezone, setTimezone] = useState(profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [currency, setCurrency] = useState(profile?.currency || 'USD');

  // Step 2 state
  const [currentTools, setCurrentTools] = useState<CurrentTool[]>(profile?.current_tools || []);
  const [facilitiesBand, setFacilitiesBand] = useState<FacilitiesCountBand>(profile?.facilities_count_band || 'band_1_3');
  const [invoicesBand, setInvoicesBand] = useState<InvoicesPerMonthBand>(profile?.invoices_per_month_band || 'inv_1_3');

  // Step 3 state
  const [dueDays, setDueDays] = useState(profile?.invoice_due_default_days || 14);
  const [duePreset, setDuePreset] = useState<'14' | '30' | 'custom'>(profile?.invoice_due_default_days === 30 ? '30' : profile?.invoice_due_default_days === 14 ? '14' : 'custom');
  
  const [emailTone, setEmailTone] = useState<EmailTone>(profile?.email_tone || 'neutral');
  const [termsFields, setTermsFields] = useState<TermsFieldsEnabled>(
    profile?.terms_fields_enabled || {
      weekday_rate: true, weekend_rate: true, cancellation_policy: true,
      overtime_policy: true, late_payment_policy: true, special_notes: true,
    }
  );

  // Tax opt-in
  const [showTaxSetup, setShowTaxSetup] = useState(false);
  const [taxDisclaimer, setTaxDisclaimer] = useState(false);

  useEffect(() => {
    console.log('onboarding_step_view', { step });
  }, [step]);

  const saveStep1 = async () => {
    console.log('onboarding_step_submit', { step: 1 });
    await updateProfile({ profession, work_style_label: workStyle, timezone, currency });
    setStep(2);
  };

  const saveStep2 = async () => {
    console.log('onboarding_step_submit', { step: 2 });
    await updateProfile({ current_tools: currentTools, facilities_count_band: facilitiesBand, invoices_per_month_band: invoicesBand });
    setStep(3);
  };

  const saveStep3 = async () => {
    console.log('onboarding_step_submit', { step: 3 });
    await updateProfile({
      invoice_due_default_days: dueDays,
      
      email_tone: emailTone,
      terms_fields_enabled: termsFields,
    });
    await completeOnboarding();
    setShowStartingPath(true);
  };

  const skipAll = async () => {
    console.log('onboarding_skip');
    await updateProfile({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
    await completeOnboarding();
    setShowStartingPath(true);
  };

  const handleStartingPath = (path: string) => {
    console.log('starting_path_select', { path });
    navigate(path);
  };

  const toggleTool = (tool: CurrentTool) => {
    setCurrentTools(prev => prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool]);
  };

  const toggleTermsField = (field: keyof TermsFieldsEnabled) => {
    setTermsFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

  if (showStartingPath) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-foreground">What do you want to do first?</h1>
            <p className="text-muted-foreground">Pick a starting point — you can always explore everything later.</p>
          </div>
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start h-auto py-4 px-5" onClick={() => handleStartingPath('/import')}>
              <Upload className="mr-3 h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="font-medium">Import from spreadsheet</div>
                <div className="text-xs text-muted-foreground">Recommended if you have existing data</div>
              </div>
            </Button>
            <Button variant="outline" className="w-full justify-start h-auto py-4 px-5" onClick={() => handleStartingPath('/facilities?add=1')}>
              <Building2 className="mr-3 h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="font-medium">Add your first facility</div>
                <div className="text-xs text-muted-foreground">Set up a clinic or practice you work with</div>
              </div>
            </Button>
            <Button variant="outline" className="w-full justify-start h-auto py-4 px-5" onClick={() => handleStartingPath('/schedule?add=1')}>
              <CalendarDays className="mr-3 h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="font-medium">Add your first shift</div>
                <div className="text-xs text-muted-foreground">Block out an upcoming shift on the calendar</div>
              </div>
            </Button>
            <Button variant="outline" className="w-full justify-start h-auto py-4 px-5" onClick={() => handleStartingPath('/')}>
              <FileText className="mr-3 h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="font-medium">Go to Dashboard</div>
                <div className="text-xs text-muted-foreground">Explore on your own</div>
              </div>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Step {step} of 3</span>
            <button onClick={skipAll} className="text-primary hover:underline flex items-center gap-1">
              <SkipForward className="h-3.5 w-3.5" /> Skip for now
            </button>
          </div>
          <Progress value={(step / 3) * 100} className="h-2" />
        </div>

        {/* Step 1 */}
        {step === 1 && (
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
                <Input value={timezone} onChange={e => setTimezone(e.target.value)} placeholder="America/New_York" />
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

        {/* Step 2 */}
        {step === 2 && (
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
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                <Button onClick={saveStep2} className="flex-1">Continue <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Set up your defaults</CardTitle>
                <CardDescription>You can change these anytime in Settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Invoice default due date</Label>
                  <RadioGroup value={duePreset} onValueChange={v => {
                    setDuePreset(v as any);
                    if (v === '14') setDueDays(14);
                    if (v === '30') setDueDays(30);
                  }}>
                    <div className="flex items-center gap-2"><RadioGroupItem value="14" id="d14" /><Label htmlFor="d14">Net 14</Label></div>
                    <div className="flex items-center gap-2"><RadioGroupItem value="30" id="d30" /><Label htmlFor="d30">Net 30</Label></div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="custom" id="dc" />
                      <Label htmlFor="dc">Custom</Label>
                      {duePreset === 'custom' && (
                        <Input type="number" className="w-20 ml-2" value={dueDays} onChange={e => setDueDays(Number(e.target.value))} min={1} />
                      )}
                    </div>
                  </RadioGroup>
                </div>
                <div>
                  <Label>Email template tone</Label>
                  <RadioGroup value={emailTone} onValueChange={v => setEmailTone(v as EmailTone)} className="flex gap-4 mt-1">
                    {TONES.map(t => (
                      <div key={t.value} className="flex items-center gap-1.5">
                        <RadioGroupItem value={t.value} id={`tone-${t.value}`} />
                        <Label htmlFor={`tone-${t.value}`}>{t.label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                <div>
                  <Label className="mb-2 block">Terms snapshot fields</Label>
                  <div className="space-y-2">
                    {([
                      ['weekday_rate', 'Weekday rate'],
                      ['weekend_rate', 'Weekend rate'],
                      ['cancellation_policy', 'Cancellation policy'],
                      ['overtime_policy', 'Overtime policy'],
                      ['late_payment_policy', 'Late payment policy'],
                      ['special_notes', 'Special notes'],
                    ] as [keyof TermsFieldsEnabled, string][]).map(([key, label]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm">{label}</span>
                        <Switch checked={termsFields[key]} onCheckedChange={() => toggleTermsField(key)} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Back</Button>
                  <Button onClick={saveStep3} className="flex-1">
                    <Check className="mr-2 h-4 w-4" /> Finish setup
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Optional Tax Setup */}
            <Card className="border-dashed">
              <CardContent className="pt-5 space-y-3">
                <div>
                  <p className="font-medium text-sm">Estimated tax tracker (not advice)</p>
                  <p className="text-xs text-muted-foreground">Helps you organize totals and reminders for your accountant.</p>
                </div>
                {!showTaxSetup ? (
                  <Button variant="outline" size="sm" onClick={() => setShowTaxSetup(true)}>Enable</Button>
                ) : (
                  <div className="space-y-3">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <Checkbox checked={taxDisclaimer} onCheckedChange={v => setTaxDisclaimer(!!v)} className="mt-0.5" />
                      <span className="text-xs text-muted-foreground">I understand LocumOps does not provide tax, legal, or financial advice. I'll confirm due dates and amounts with my accountant.</span>
                    </label>
                    {taxDisclaimer && (
                      <p className="text-xs text-primary flex items-center gap-1"><Check className="h-3 w-3" /> Tax tracker enabled. You can configure it in Settings → Taxes.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
