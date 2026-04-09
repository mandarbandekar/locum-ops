import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useData } from '@/contexts/DataContext';
import { useClinicConfirmations } from '@/hooks/useClinicConfirmations';
import { generateId } from '@/lib/businessLogic';
import type { FacilityStatus } from '@/types';
import { toast } from 'sonner';
import {
  ArrowLeft, ArrowRight, SkipForward, AlertTriangle,
  Building2, DollarSign, Monitor, DoorOpen, UserCheck, CalendarClock, FileText,
  Sparkles, Check, Info, CircleDot
} from 'lucide-react';
import { GooglePlacesAutocomplete } from '@/components/GooglePlacesAutocomplete';
import type { PlaceSelection } from '@/components/GooglePlacesAutocomplete';
import { RatesEditor, RateEntry, ratesToTermsFields } from '@/components/facilities/RatesEditor';
import type { BillingCadence } from '@/lib/invoiceBillingDefaults';

const STEP_META = [
  { label: 'Welcome', icon: Sparkles, required: false, hint: '' },
  { label: 'General', icon: Building2, required: true, hint: 'This is how the clinic appears across your schedule, invoices, and reports.' },
  { label: 'Shift Rates', icon: DollarSign, required: false, hint: 'Setting rates now means your invoices calculate automatically — no manual math.' },
  { label: 'Tech Access', icon: Monitor, required: false, hint: 'Store login info here so you\'re never scrambling on your first morning at a clinic.' },
  { label: 'Clinic Access', icon: DoorOpen, required: false, hint: 'Door codes and parking details in one place — handy before each shift.' },
  { label: 'Scheduling Contact', icon: UserCheck, required: true, hint: 'This person receives shift confirmation emails so clinics know when you\'re coming.' },
  { label: 'Invoicing Preferences', icon: CalendarClock, required: false, hint: 'Controls how often draft invoices are created from your completed shifts.' },
  { label: 'Invoice Settings', icon: FileText, required: true, hint: 'The billing contact who receives your invoices. Required for auto-sending.' },
];

export function AddFacilityDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated?: (facilityId: string) => void }) {
  const { addFacility, updateTerms } = useData();
  const { saveSettings: saveConfirmationSettings } = useClinicConfirmations();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [status] = useState<FacilityStatus>('active');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [clinicSearchValue, setClinicSearchValue] = useState('');
  const [manualEntry, setManualEntry] = useState(false);
  const [clinicSelected, setClinicSelected] = useState(false);
  const [rates, setRates] = useState<RateEntry[]>([]);
  const [techComputer, setTechComputer] = useState('');
  const [techWifi, setTechWifi] = useState('');
  const [techPims, setTechPims] = useState('');
  const [clinicAccess, setClinicAccess] = useState('');
  const [invoicePrefix, setInvoicePrefix] = useState('');
  const [invoiceDueDays, setInvoiceDueDays] = useState(15);
  const [invoiceNameTo, setInvoiceNameTo] = useState('');
  const [invoiceEmailTo, setInvoiceEmailTo] = useState('');
  const [invoiceNameCc, setInvoiceNameCc] = useState('');
  const [invoiceEmailCc, setInvoiceEmailCc] = useState('');
  const [invoiceNameBcc, setInvoiceNameBcc] = useState('');
  const [invoiceEmailBcc, setInvoiceEmailBcc] = useState('');
  const [schedulingContactName, setSchedulingContactName] = useState('');
  const [schedulingContactEmail, setSchedulingContactEmail] = useState('');
  const [billingCadence, setBillingCadence] = useState<BillingCadence>('monthly');
  
  const totalSteps = STEP_META.length;
  const progress = ((step + 1) / totalSteps) * 100;

  function getInitials(text: string): string {
    return text.split(/\s+/).map(w => w[0]).filter(Boolean).join('').toUpperCase().slice(0, 4) || 'INV';
  }

  const resetForm = () => {
    setStep(0);
    setName(''); setAddress(''); setNotes('');
    setClinicSearchValue(''); setManualEntry(false); setClinicSelected(false);
    setRates([]);
    setTechComputer(''); setTechWifi(''); setTechPims('');
    setClinicAccess(''); setInvoicePrefix(''); setInvoiceDueDays(15);
    setInvoiceNameTo(''); setInvoiceEmailTo(''); setInvoiceNameCc(''); setInvoiceEmailCc(''); setInvoiceNameBcc(''); setInvoiceEmailBcc('');
    setSchedulingContactName(''); setSchedulingContactEmail('');
    setBillingCadence('monthly');
  };

  const handleClinicPlaceSelect = (selection: PlaceSelection) => {
    setName(selection.name);
    setAddress(selection.formatted_address || selection.description);
    setClinicSelected(true);
    setClinicSearchValue(selection.name);
  };

  const handleSubmit = async () => {
    for (const s of [1, 5, 7]) {
      const err = validateStep(s);
      if (err) { toast.error(err); setStep(s); return; }
    }

    const prefix = invoicePrefix || getInitials(name);
    const hasAnyRates = rates.length > 0 && rates.some(r => r.amount > 0);

    try {
      const facility = await addFacility({
        name, status, address, timezone: 'America/Los_Angeles', notes,
        outreach_last_sent_at: null,
        tech_computer_info: techComputer,
        tech_wifi_info: techWifi,
        tech_pims_info: techPims,
        clinic_access_info: clinicAccess,
        invoice_prefix: prefix,
        invoice_due_days: invoiceDueDays,
        invoice_name_to: invoiceNameTo.trim(),
        invoice_email_to: invoiceEmailTo.trim(),
        invoice_name_cc: invoiceNameCc.trim(),
        invoice_email_cc: invoiceEmailCc.trim(),
        invoice_name_bcc: invoiceNameBcc.trim(),
        invoice_email_bcc: invoiceEmailBcc.trim(),
        billing_cadence: billingCadence,
        billing_cycle_anchor_date: null,
        billing_week_end_day: 'saturday',
        auto_generate_invoices: true,
      });

      if (hasAnyRates) {
        const fields = ratesToTermsFields(rates);
        await updateTerms({
          id: generateId(),
          facility_id: facility.id,
          ...fields,
          cancellation_policy_text: '',
          overtime_policy_text: '',
          late_payment_policy_text: '',
          special_notes: '',
        });
      }

      await saveConfirmationSettings({
        id: '',
        facility_id: facility.id,
        primary_contact_name: schedulingContactName.trim(),
        primary_contact_email: schedulingContactEmail.trim(),
        secondary_contact_email: '',
        monthly_enabled: true,
        monthly_send_offset_days: 7,
        preshift_enabled: false,
        preshift_send_offset_days: 3,
        auto_send_enabled: false,
        auto_send_monthly: false,
        auto_send_preshift: false,
      });

      toast.success('Practice facility added');
      onCreated?.(facility.id);
      resetForm();
      onOpenChange(false);
    } catch {
      // error toast handled in DataContext
    }
  };

  const isEmailValid = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validateStep = (s: number): string | null => {
    if (s === 1 && !name.trim()) return 'Please enter a facility name';
    if (s === 5) {
      if (!schedulingContactName.trim()) return 'Scheduling contact name is required';
      if (!schedulingContactEmail.trim()) return 'Scheduling contact email is required';
      if (!isEmailValid(schedulingContactEmail.trim())) return 'Please enter a valid scheduling contact email';
    }
    if (s === 7) {
      if (!invoiceNameTo.trim()) return 'Billing contact name (To) is required';
      if (!invoiceEmailTo.trim()) return 'Billing contact email (To) is required';
      if (!isEmailValid(invoiceEmailTo.trim())) return 'Please enter a valid billing email';
    }
    return null;
  };

  const currentMeta = STEP_META[step];
  const isOptionalStep = !currentMeta.required && step > 0;

  const handleNext = () => {
    const err = validateStep(step);
    if (err) { toast.error(err); return; }
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSkip = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const hasRates = rates.length > 0 && rates.some(r => r.amount > 0);
  const hasTechAccess = !!(techComputer || techWifi || techPims);
  const hasClinicAccess = !!clinicAccess;

  const summaryItems = [
    { label: 'Clinic', value: name || '—', filled: !!name },
    { label: 'Address', value: address || 'Skipped', filled: !!address },
    { label: 'Shift Rates', value: hasRates ? `${rates.filter(r => r.amount > 0).length} configured` : 'Skipped', filled: hasRates },
    { label: 'Tech Access', value: hasTechAccess ? 'Filled' : 'Skipped', filled: hasTechAccess },
    { label: 'Clinic Access', value: hasClinicAccess ? 'Filled' : 'Skipped', filled: hasClinicAccess },
    { label: 'Scheduling Contact', value: schedulingContactName || '—', filled: !!schedulingContactName },
    { label: 'Billing Cadence', value: billingCadence.charAt(0).toUpperCase() + billingCadence.slice(1), filled: true },
    { label: 'Billing Contact', value: invoiceNameTo || '—', filled: !!invoiceNameTo },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-[680px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step > 0 && (
              <>
                <currentMeta.icon className="h-5 w-5 text-primary" />
                {currentMeta.label}
                {currentMeta.required && (
                  <Badge variant="default" className="text-[10px] px-1.5 py-0">Required</Badge>
                )}
                {isOptionalStep && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Optional</Badge>
                )}
              </>
            )}
            {step === 0 && 'Add Practice Facility'}
          </DialogTitle>
        </DialogHeader>

        {/* Visual Stepper (hidden on welcome) */}
        {step > 0 && (
          <div className="flex items-center justify-between px-1">
            {STEP_META.slice(1).map((meta, i) => {
              const stepIndex = i + 1;
              const isCompleted = stepIndex < step;
              const isCurrent = stepIndex === step;
              const Icon = meta.icon;
              return (
                <div key={meta.label} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`relative flex items-center justify-center h-8 w-8 rounded-full border-2 transition-colors ${
                      isCompleted ? 'bg-primary border-primary text-primary-foreground' :
                      isCurrent ? 'border-primary bg-primary/10 text-primary' :
                      'border-muted-foreground/30 text-muted-foreground/50'
                    }`}>
                      {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                      {meta.required && !isCompleted && (
                        <CircleDot className="absolute -top-0.5 -right-0.5 h-3 w-3 text-primary" />
                      )}
                    </div>
                    <span className={`text-[10px] leading-tight text-center max-w-[60px] ${
                      isCurrent ? 'text-primary font-medium' : 'text-muted-foreground/60'
                    }`}>{meta.label}</span>
                  </div>
                  {i < STEP_META.length - 2 && (
                    <div className={`flex-1 h-0.5 mx-1 mt-[-16px] ${isCompleted ? 'bg-primary' : 'bg-muted-foreground/20'}`} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Progress bar */}
        {step > 0 && <Progress value={progress} className="h-1.5" />}

        {/* Contextual hint */}
        {step > 0 && currentMeta.hint && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">{currentMeta.hint}</p>
          </div>
        )}

        {/* Step content */}
        <div className="space-y-3 min-h-[200px]">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="flex flex-col items-center text-center py-4 space-y-5">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Building2 className="h-7 w-7 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Let's set up your practice</h2>
                <p className="text-sm text-muted-foreground max-w-sm">
                  We'll walk you through a few quick steps to get this clinic configured in LocumOps.
                </p>
              </div>
              <div className="text-left space-y-3 w-full max-w-sm">
                {[
                  { icon: Building2, text: 'Clinic name and address' },
                  { icon: DollarSign, text: 'Shift rates for automatic invoicing' },
                  { icon: UserCheck, text: 'Scheduling and billing contacts' },
                  { icon: CalendarClock, text: 'Invoicing cadence and preferences' },
                ].map(({ icon: Ic, text }) => (
                  <div key={text} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Ic className="h-4 w-4" />
                    </div>
                    {text}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground max-w-sm">
                Only the <span className="font-medium text-foreground">clinic name</span>, <span className="font-medium text-foreground">scheduling contact</span>, and <span className="font-medium text-foreground">billing contact</span> are required. Everything else can be added later.
              </p>
            </div>
          )}

          {/* Step 1: General */}
          {step === 1 && (
            <>
              {!manualEntry && !clinicSelected && (
                <div className="space-y-2">
                  <Label>Search for your clinic</Label>
                  <GooglePlacesAutocomplete
                    value={clinicSearchValue}
                    onChange={setClinicSearchValue}
                    placeholder="e.g. Valley Animal Hospital"
                    searchType="establishment"
                    onPlaceSelect={handleClinicPlaceSelect}
                    icon="search"
                  />
                  <button
                    type="button"
                    onClick={() => setManualEntry(true)}
                    className="text-xs text-primary hover:underline"
                  >
                    Can't find it? Enter manually
                  </button>
                </div>
              )}

              {(manualEntry || clinicSelected) && (
                <>
                  {clinicSelected && (
                    <button
                      type="button"
                      onClick={() => { setClinicSelected(false); setName(''); setAddress(''); setClinicSearchValue(''); }}
                      className="text-xs text-primary hover:underline mb-1"
                    >
                      ← Search again
                    </button>
                  )}
                  <div className="space-y-2">
                    <Label>Name <span className="text-destructive">*</span></Label>
                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="Practice facility name" autoFocus={manualEntry} />
                  </div>
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <GooglePlacesAutocomplete value={address} onChange={setAddress} placeholder="Full address" />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes..." rows={3} />
                  </div>
                </>
              )}
            </>
          )}

          {/* Step 2: Shift Rates */}
          {step === 2 && (
            <RatesEditor rates={rates} onChange={setRates} showCard={false} compact />
          )}

          {/* Step 3: Tech Access */}
          {step === 3 && (
            <>
              <div className="space-y-2">
                <Label>Computer / Login Info</Label>
                <Textarea value={techComputer} onChange={e => setTechComputer(e.target.value)} placeholder="Computer login, desktop credentials..." rows={2} />
              </div>
              <div className="space-y-2">
                <Label>WiFi Passwords</Label>
                <Textarea value={techWifi} onChange={e => setTechWifi(e.target.value)} placeholder="Network name, password..." rows={2} />
              </div>
              <div className="space-y-2">
                <Label>PIMS Credentials</Label>
                <Textarea value={techPims} onChange={e => setTechPims(e.target.value)} placeholder="PIMS system, username, password..." rows={2} />
              </div>
            </>
          )}

          {/* Step 4: Clinic Access */}
          {step === 4 && (
            <div className="space-y-2">
              <Label>Clinic Access Information</Label>
              <Textarea value={clinicAccess} onChange={e => setClinicAccess(e.target.value)} placeholder="Door codes, parking instructions, key pickup, building access..." rows={5} />
            </div>
          )}

          {/* Step 5: Scheduling Contact */}
          {step === 5 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Contact Name <span className="text-destructive">*</span></Label>
                  <Input value={schedulingContactName} onChange={e => setSchedulingContactName(e.target.value)} placeholder="Practice Manager" />
                </div>
                <div className="space-y-2">
                  <Label>Contact Email <span className="text-destructive">*</span></Label>
                  <Input type="email" value={schedulingContactEmail} onChange={e => setSchedulingContactEmail(e.target.value)} placeholder="manager@clinic.com" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">This contact will be used for shift confirmations. You can configure auto-send settings later.</p>
            </>
          )}

          {/* Step 6: Invoicing Preferences */}
          {step === 6 && (
            <>
              <div className="space-y-2">
                <Label>Billing cadence</Label>
                <Select value={billingCadence} onValueChange={(v: BillingCadence) => setBillingCadence(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly (Mon–Sun)</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
                {billingCadence === 'weekly' && (
                  <p className="text-xs text-muted-foreground">Billing week runs Monday through Sunday.</p>
                )}
                {billingCadence === 'monthly' && (
                  <p className="text-xs text-muted-foreground">Draft generates on the morning of your last scheduled shift of the month.</p>
                )}
                {billingCadence === 'daily' && (
                  <p className="text-xs text-muted-foreground">A draft invoice is generated each morning you have a scheduled shift.</p>
                )}
              </div>

            </>
          )}

          {/* Step 7: Invoice Settings */}
          {step === 7 && (
            <>
              <p className="text-xs font-medium text-muted-foreground">To</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Name <span className="text-destructive">*</span></Label>
                  <Input value={invoiceNameTo} onChange={e => setInvoiceNameTo(e.target.value)} placeholder="Billing Department" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email <span className="text-destructive">*</span></Label>
                  <Input type="email" value={invoiceEmailTo} onChange={e => setInvoiceEmailTo(e.target.value)} placeholder="billing@clinic.com" />
                </div>
              </div>
              <p className="text-xs font-medium text-muted-foreground pt-1">CC</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input value={invoiceNameCc} onChange={e => setInvoiceNameCc(e.target.value)} placeholder="Office Manager" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input type="email" value={invoiceEmailCc} onChange={e => setInvoiceEmailCc(e.target.value)} placeholder="manager@clinic.com" />
                </div>
              </div>
              <p className="text-xs font-medium text-muted-foreground pt-1">BCC</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input value={invoiceNameBcc} onChange={e => setInvoiceNameBcc(e.target.value)} placeholder="Records" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input type="email" value={invoiceEmailBcc} onChange={e => setInvoiceEmailBcc(e.target.value)} placeholder="records@clinic.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Invoice Prefix</Label>
                  <Input value={invoicePrefix} onChange={e => setInvoicePrefix(e.target.value.toUpperCase())} placeholder={name ? getInitials(name) : 'INV'} />
                  <p className="text-xs text-muted-foreground">
                    e.g. {invoicePrefix || (name ? getInitials(name) : 'INV')}-2026-001
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Invoice Due (days)</Label>
                  <Input type="number" value={invoiceDueDays} onChange={e => setInvoiceDueDays(Number(e.target.value))} min={1} placeholder="15" />
                  <p className="text-xs text-muted-foreground">Net {invoiceDueDays}</p>
                </div>
              </div>

              {/* Completion Summary */}
              <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border space-y-2">
                <p className="text-xs font-medium">Setup Summary</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {summaryItems.map(item => (
                    <div key={item.label} className="flex items-center gap-1.5 text-xs">
                      {item.filled ? (
                        <Check className="h-3 w-3 text-primary shrink-0" />
                      ) : (
                        <SkipForward className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                      )}
                      <span className="text-muted-foreground">{item.label}:</span>
                      <span className={`truncate ${item.filled ? 'text-foreground' : 'text-muted-foreground/50'}`}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          {step === 0 ? (
            <>
              <div />
              <Button type="button" onClick={handleNext}>
                Get Started <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="ghost" size="sm" onClick={handleBack}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <div className="flex items-center gap-2">
                {isOptionalStep && step < totalSteps - 1 && (
                  <Button type="button" variant="outline" size="sm" onClick={handleSkip}>
                    <SkipForward className="mr-1 h-3.5 w-3.5" /> Skip
                  </Button>
                )}
                <Button type="button" size="sm" onClick={handleNext}>
                  {step === totalSteps - 1 ? 'Add Facility' : (
                    <>Next <ArrowRight className="ml-1 h-4 w-4" /></>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
