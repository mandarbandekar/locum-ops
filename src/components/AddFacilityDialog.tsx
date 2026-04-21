import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Textarea } from '@/components/ui/textarea';
import { useData } from '@/contexts/DataContext';
import { useClinicConfirmations } from '@/hooks/useClinicConfirmations';
import { generateId } from '@/lib/businessLogic';
import type { FacilityStatus } from '@/types';
import { toast } from 'sonner';
import {
  ArrowLeft, ArrowRight, SkipForward,
  Building2, DollarSign, UserCheck, CalendarClock,
  Sparkles, Check, Info, CircleDot, Settings2,
  Monitor, DoorOpen
} from 'lucide-react';
import { GooglePlacesAutocomplete } from '@/components/GooglePlacesAutocomplete';
import type { PlaceSelection } from '@/components/GooglePlacesAutocomplete';
import type { BillingCadence } from '@/lib/invoiceBillingDefaults';
import { RatesEditor, type RateEntry } from '@/components/facilities/RatesEditor';
import { ratesToTermsFields } from '@/components/facilities/RatesEditor';
import { EngagementSelector } from '@/components/facilities/EngagementSelector';
import type { EngagementType, TaxFormType } from '@/lib/engagementOptions';
import { supabase } from '@/integrations/supabase/client';

const STEP_META = [
  { label: 'Welcome', icon: Sparkles, required: false, hint: '' },
  { label: 'Clinic Details', icon: Building2, required: true, hint: 'This is how the clinic appears across your schedule, invoices, and reports.' },
  { label: 'Contacts', icon: UserCheck, required: true, hint: 'These contacts receive shift confirmations and invoices on your behalf.' },
  { label: 'Billing Setup', icon: CalendarClock, required: false, hint: 'Controls how often draft invoices are created from your completed shifts.' },
  { label: 'Optional Details', icon: Settings2, required: false, hint: 'These details help you stay prepared and track expenses automatically. You can always add them later.' },
];

export function AddFacilityDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated?: (facilityId: string) => void }) {
  const { addFacility, updateTerms, facilities } = useData();
  const { saveSettings: saveConfirmationSettings } = useClinicConfirmations();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [status] = useState<FacilityStatus>('active');
  const [address, setAddress] = useState('');
  const [clinicSearchValue, setClinicSearchValue] = useState('');
  const [manualEntry, setManualEntry] = useState(false);
  const [clinicSelected, setClinicSelected] = useState(false);
  const [rates, setRates] = useState<RateEntry[]>([]);
  const [schedulingContactName, setSchedulingContactName] = useState('');
  const [schedulingContactEmail, setSchedulingContactEmail] = useState('');
  const [invoiceNameTo, setInvoiceNameTo] = useState('');
  const [invoiceEmailTo, setInvoiceEmailTo] = useState('');
  const [sameAsScheduling, setSameAsScheduling] = useState(false);
  const [billingCadence, setBillingCadence] = useState<BillingCadence>('monthly');
  const [invoiceDueDays, setInvoiceDueDays] = useState(15);
  const [engagementType, setEngagementType] = useState<EngagementType>('direct');
  const [sourceName, setSourceName] = useState('');
  const [taxFormType, setTaxFormType] = useState<TaxFormType>('1099');

  // Step 4 enrichment state
  const [enrichRates, setEnrichRates] = useState<RateEntry[]>([]);
  
  const [techComputer, setTechComputer] = useState('');
  const [techWifi, setTechWifi] = useState('');
  const [techPims, setTechPims] = useState('');
  const [clinicAccess, setClinicAccess] = useState('');
  const createdFacilityIdRef = useRef<string | null>(null);

  const totalSteps = STEP_META.length;
  const coreSteps = 4; // steps 0-3 are core
  const progress = step < coreSteps ? ((step + 1) / coreSteps) * 100 : 100;

  function getInitials(text: string): string {
    return text.split(/\s+/).map(w => w[0]).filter(Boolean).join('').toUpperCase().slice(0, 4) || 'INV';
  }

  const resetForm = () => {
    setStep(0);
    setName(''); setAddress('');
    setClinicSearchValue(''); setManualEntry(false); setClinicSelected(false);
    setRates([]);
    setSchedulingContactName(''); setSchedulingContactEmail('');
    setInvoiceNameTo(''); setInvoiceEmailTo('');
    setSameAsScheduling(false);
    setBillingCadence('monthly'); setInvoiceDueDays(15);
    setEngagementType('direct'); setSourceName(''); setTaxFormType('1099');
    
    setTechComputer(''); setTechWifi(''); setTechPims(''); setClinicAccess('');
    createdFacilityIdRef.current = null;
  };

  const handleClinicPlaceSelect = (selection: PlaceSelection) => {
    setName(selection.name);
    setAddress(selection.formatted_address || selection.description);
    setClinicSelected(true);
    setClinicSearchValue(selection.name);
  };

  const effectiveBillingName = sameAsScheduling ? schedulingContactName : invoiceNameTo;
  const effectiveBillingEmail = sameAsScheduling ? schedulingContactEmail : invoiceEmailTo;

  const handleCreateFacility = async (): Promise<boolean> => {
    for (const s of [1, 2]) {
      const err = validateStep(s);
      if (err) { toast.error(err); setStep(s); return false; }
    }

    const prefix = getInitials(name);
    const rateFields = ratesToTermsFields(rates);

    try {
      const facility = await addFacility({
        name, status, address, timezone: 'America/Los_Angeles', notes: '',
        outreach_last_sent_at: null,
        tech_computer_info: '',
        tech_wifi_info: '',
        tech_pims_info: '',
        clinic_access_info: '',
        invoice_prefix: prefix,
        invoice_due_days: invoiceDueDays,
        invoice_name_to: effectiveBillingName.trim(),
        invoice_email_to: effectiveBillingEmail.trim(),
        invoice_name_cc: '',
        invoice_email_cc: '',
        invoice_name_bcc: '',
        invoice_email_bcc: '',
        billing_cadence: billingCadence,
        billing_cycle_anchor_date: null,
        billing_week_end_day: 'saturday',
        auto_generate_invoices: true,
      });

      createdFacilityIdRef.current = facility.id;

      if (rates.length > 0) {
        await updateTerms({
          id: generateId(),
          facility_id: facility.id,
          ...rateFields,
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

      return true;
    } catch {
      return false;
    }
  };

  const handleSaveEnrichment = async () => {
    const facilityId = createdFacilityIdRef.current;
    if (!facilityId) return;

    try {
      // Save facility-level enrichment fields
      const updates: Record<string, unknown> = {};
      if (techComputer.trim()) updates.tech_computer_info = techComputer.trim();
      if (techWifi.trim()) updates.tech_wifi_info = techWifi.trim();
      if (techPims.trim()) updates.tech_pims_info = techPims.trim();
      if (clinicAccess.trim()) updates.clinic_access_info = clinicAccess.trim();

      if (Object.keys(updates).length > 0) {
        await supabase.from('facilities').update(updates).eq('id', facilityId);
      }

      toast.success('Clinic details saved — you\'re all set!');
      onCreated?.(facilityId);
      resetForm();
      onOpenChange(false);
    } catch {
      toast.error('Failed to save optional details');
    }
  };

  const handleSkipEnrichment = () => {
    const facilityId = createdFacilityIdRef.current;
    toast.success('Clinic added! You can add more details anytime from the clinic page.', {
      duration: 4000,
    });
    onCreated?.(facilityId!);
    resetForm();
    onOpenChange(false);
  };

  const isEmailValid = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validateStep = (s: number): string | null => {
    if (s === 1 && !name.trim()) return 'Please enter a facility name';
    if (s === 2) {
      if (!schedulingContactName.trim()) return 'Scheduling contact name is required';
      if (!schedulingContactEmail.trim()) return 'Scheduling contact email is required';
      if (!isEmailValid(schedulingContactEmail.trim())) return 'Please enter a valid scheduling contact email';
      const bName = sameAsScheduling ? schedulingContactName : invoiceNameTo;
      const bEmail = sameAsScheduling ? schedulingContactEmail : invoiceEmailTo;
      if (!bName.trim()) return 'Billing contact name is required';
      if (!bEmail.trim()) return 'Billing contact email is required';
      if (!isEmailValid(bEmail.trim())) return 'Please enter a valid billing email';
    }
    return null;
  };

  const currentMeta = STEP_META[step];
  const isOptionalStep = !currentMeta.required && step > 0 && step < coreSteps;

  const handleNext = async () => {
    const err = validateStep(step);
    if (err) { toast.error(err); return; }

    // At step 3 (Billing Setup), create the facility then advance to enrichment
    if (step === coreSteps - 1) {
      const success = await handleCreateFacility();
      if (success) setStep(coreSteps);
      return;
    }

    if (step < totalSteps - 1) {
      setStep(step + 1);
    }
  };

  const handleSkip = () => {
    if (step < coreSteps - 1) setStep(step + 1);
  };

  const handleBack = () => {
    // Don't allow going back from enrichment step (facility already created)
    if (step > 0 && step < coreSteps) setStep(step - 1);
  };

  const hasRates = rates.length > 0;

  const summaryItems = [
    { label: 'Clinic', value: name || '—', filled: !!name },
    { label: 'Address', value: address || 'Skipped', filled: !!address },
    { label: 'Rates', value: hasRates ? `${rates.length} rate${rates.length > 1 ? 's' : ''}` : 'Skipped', filled: hasRates },
    { label: 'Scheduling Contact', value: schedulingContactName || '—', filled: !!schedulingContactName },
    { label: 'Billing Contact', value: effectiveBillingName || '—', filled: !!effectiveBillingName },
    { label: 'Billing Cadence', value: billingCadence.charAt(0).toUpperCase() + billingCadence.slice(1), filled: true },
    { label: 'Payment Terms', value: `Net ${invoiceDueDays}`, filled: true },
  ];

  const hasAnyEnrichment = techComputer.trim() || techWifi.trim() || techPims.trim() || clinicAccess.trim();

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-[680px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step > 0 && step < coreSteps && (
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
            {step === coreSteps && (
              <>
                <Check className="h-5 w-5 text-primary" />
                Clinic Added — Optional Details
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Visual Stepper (steps 1-3 only) */}
        {step > 0 && step < coreSteps && (
          <div className="flex items-center justify-between px-1">
            {STEP_META.slice(1, coreSteps).map((meta, i) => {
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
                  {i < coreSteps - 2 && (
                    <div className={`flex-1 h-0.5 mx-1 mt-[-16px] ${isCompleted ? 'bg-primary' : 'bg-muted-foreground/20'}`} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {step > 0 && step < coreSteps && <Progress value={progress} className="h-1.5" />}

        {step > 0 && step < coreSteps && currentMeta.hint && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">{currentMeta.hint}</p>
          </div>
        )}

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
                  Three quick steps to get this clinic configured in LocumOps.
                </p>
              </div>
              <div className="text-left space-y-3 w-full max-w-sm">
                {[
                  { icon: Building2, text: 'Clinic name, address, and shift rates' },
                  { icon: UserCheck, text: 'Scheduling and billing contacts' },
                  { icon: CalendarClock, text: 'Billing cadence and payment terms' },
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
                Only the <span className="font-medium text-foreground">clinic name</span> is required. Everything else can be added later from the facility detail page.
              </p>
            </div>
          )}

          {/* Step 1: Clinic Details */}
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
                </>
              )}

              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <Label>Shift Rates</Label>
                </div>
                <RatesEditor
                  rates={rates}
                  onChange={setRates}
                  showCard={false}
                  compact
                />
                <p className="text-xs text-muted-foreground">The rates you set become the defaults for new shifts at this clinic — one less thing to enter each time.</p>
              </div>
            </>
          )}

          {/* Step 2: Contacts */}
          {step === 2 && (
            <>
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Scheduling Contact</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Name <span className="text-destructive">*</span></Label>
                    <Input value={schedulingContactName} onChange={e => setSchedulingContactName(e.target.value)} placeholder="Practice Manager" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Email <span className="text-destructive">*</span></Label>
                    <Input type="email" value={schedulingContactEmail} onChange={e => setSchedulingContactEmail(e.target.value)} placeholder="manager@clinic.com" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Receives shift confirmation emails so clinics know when you're coming.</p>
              </div>

              <div className="border-t border-border pt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Billing Contact</p>
                  {schedulingContactName && schedulingContactEmail && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={sameAsScheduling}
                        onCheckedChange={(checked) => setSameAsScheduling(checked === true)}
                      />
                      <span className="text-xs text-muted-foreground">Same as scheduling</span>
                    </label>
                  )}
                </div>
                {!sameAsScheduling && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Name <span className="text-destructive">*</span></Label>
                      <Input value={invoiceNameTo} onChange={e => setInvoiceNameTo(e.target.value)} placeholder="Billing Department" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Email <span className="text-destructive">*</span></Label>
                      <Input type="email" value={invoiceEmailTo} onChange={e => setInvoiceEmailTo(e.target.value)} placeholder="billing@clinic.com" />
                    </div>
                  </div>
                )}
                {sameAsScheduling && (
                  <p className="text-xs text-muted-foreground">
                    Invoices will be sent to {schedulingContactName} ({schedulingContactEmail})
                  </p>
                )}
              </div>
            </>
          )}

          {/* Step 3: Billing + Summary */}
          {step === 3 && (
            <>
              <div className="grid grid-cols-2 gap-4">
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
                    <p className="text-xs text-muted-foreground">Draft generates after your last shift of the month.</p>
                  )}
                  {billingCadence === 'daily' && (
                    <p className="text-xs text-muted-foreground">A draft invoice each morning you have a shift.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Payment terms</Label>
                  <Select value={String(invoiceDueDays)} onValueChange={v => setInvoiceDueDays(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Net 7</SelectItem>
                      <SelectItem value="14">Net 14</SelectItem>
                      <SelectItem value="15">Net 15</SelectItem>
                      <SelectItem value="30">Net 30</SelectItem>
                      <SelectItem value="45">Net 45</SelectItem>
                      <SelectItem value="60">Net 60</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Due date added to each invoice automatically.</p>
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

          {/* Step 4: Post-creation enrichment */}
          {step === coreSteps && (
            <div className="space-y-4">
              {/* Success banner */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Check className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{name} has been added!</p>
                  <p className="text-xs text-muted-foreground">
                    Want to add a few more details? These help you stay organized and track expenses automatically.
                  </p>
                </div>
              </div>

              <Accordion type="multiple" className="space-y-2">

                {/* Tech Access */}
                <AccordionItem value="tech" className="border rounded-lg px-3">
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-2 text-left">
                      <Monitor className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Tech Access</p>
                        <p className="text-xs text-muted-foreground font-normal">
                          Computer logins, wifi, and PIMS details
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-3">
                    <div className="space-y-3">
                      <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
                        <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">
                          Save these so you're not scrambling on your first day at a new clinic. They'll show up on your shift detail view.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Computer / Login</Label>
                          <Input value={techComputer} onChange={e => setTechComputer(e.target.value)} placeholder="e.g. Username: drsmith / Password: clinic123" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">WiFi</Label>
                          <Input value={techWifi} onChange={e => setTechWifi(e.target.value)} placeholder="e.g. Network: ClinicWifi / Password: vetlife2026" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">PIMS Software</Label>
                          <Input value={techPims} onChange={e => setTechPims(e.target.value)} placeholder="e.g. eVetPractice — login with clinic credentials" />
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Clinic Access */}
                <AccordionItem value="access" className="border rounded-lg px-3">
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-2 text-left">
                      <DoorOpen className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Clinic Access</p>
                        <p className="text-xs text-muted-foreground font-normal">
                          Door codes, parking, and entry instructions
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-3">
                    <div className="space-y-3">
                      <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
                        <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">
                          Door codes, parking instructions, after-hours entry — everything you need to walk in confidently on shift day.
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Access Notes</Label>
                        <Textarea
                          value={clinicAccess}
                          onChange={e => setClinicAccess(e.target.value)}
                          placeholder="e.g. Side door code: 4523. Park in staff lot behind building. Key lockbox by rear entrance."
                          rows={3}
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
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
          ) : step === coreSteps ? (
            // Enrichment step navigation
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={handleSkipEnrichment}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip — I'll add these later
              </button>
              <Button type="button" size="sm" onClick={handleSaveEnrichment} disabled={!hasAnyEnrichment}>
                <Check className="mr-1 h-3.5 w-3.5" /> Save & Close
              </Button>
            </div>
          ) : (
            <>
              <Button type="button" variant="ghost" size="sm" onClick={handleBack}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <div className="flex items-center gap-2">
                {isOptionalStep && step < coreSteps - 1 && (
                  <Button type="button" variant="outline" size="sm" onClick={handleSkip}>
                    <SkipForward className="mr-1 h-3.5 w-3.5" /> Skip
                  </Button>
                )}
                <Button type="button" size="sm" onClick={handleNext}>
                  {step === coreSteps - 1 ? 'Add Facility' : (
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
