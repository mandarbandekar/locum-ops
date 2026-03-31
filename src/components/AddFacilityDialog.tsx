import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useData } from '@/contexts/DataContext';
import { useClinicConfirmations } from '@/hooks/useClinicConfirmations';
import { generateId } from '@/lib/businessLogic';
import { FacilityStatus } from '@/types';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, SkipForward, AlertTriangle } from 'lucide-react';
import { RatesEditor, RateEntry, ratesToTermsFields } from '@/components/facilities/RatesEditor';
import type { BillingCadence } from '@/lib/invoiceBillingDefaults';

const STEPS = [
  { label: 'General', description: 'Name & basic info' },
  { label: 'Shift Rates', description: 'Rate configuration' },
  { label: 'Tech Access', description: 'Logins & credentials' },
  { label: 'Clinic Access', description: 'Door codes & parking' },
  { label: 'Scheduling Contact', description: 'Confirmation contact info' },
  { label: 'Invoicing Preferences', description: 'Billing cadence & automation' },
  { label: 'Invoice Settings', description: 'Prefix, contacts & terms' },
];

export function AddFacilityDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated?: (facilityId: string) => void }) {
  const { addFacility, updateTerms } = useData();
  const { saveSettings: saveConfirmationSettings } = useClinicConfirmations();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [status, setStatus] = useState<FacilityStatus>('prospect');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
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
  const [autoGenerateInvoices, setAutoGenerateInvoices] = useState(true);
  const totalSteps = STEPS.length;
  const progress = ((step + 1) / totalSteps) * 100;

  function getInitials(text: string): string {
    return text.split(/\s+/).map(w => w[0]).filter(Boolean).join('').toUpperCase().slice(0, 4) || 'INV';
  }

  const resetForm = () => {
    setStep(0);
    setName(''); setAddress(''); setNotes(''); setStatus('prospect');
    setRates([]);
    setTechComputer(''); setTechWifi(''); setTechPims('');
    setClinicAccess(''); setInvoicePrefix(''); setInvoiceDueDays(15);
    setInvoiceNameTo(''); setInvoiceEmailTo(''); setInvoiceNameCc(''); setInvoiceEmailCc(''); setInvoiceNameBcc(''); setInvoiceEmailBcc('');
    setSchedulingContactName(''); setSchedulingContactEmail('');
    setBillingCadence('monthly'); setAutoGenerateInvoices(true);
  };

  const handleSubmit = async () => {
    // Validate all mandatory steps
    for (const s of [0, 4, 6]) {
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
        auto_generate_invoices: autoGenerateInvoices && !!(invoiceEmailTo.trim()),
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

      // Save scheduling contact if provided
      if (schedulingContactEmail.trim()) {
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
      }

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
    if (s === 0 && !name.trim()) return 'Please enter a facility name';
    if (s === 4) {
      if (!schedulingContactName.trim()) return 'Scheduling contact name is required';
      if (!schedulingContactEmail.trim()) return 'Scheduling contact email is required';
      if (!isEmailValid(schedulingContactEmail.trim())) return 'Please enter a valid scheduling contact email';
    }
    if (s === 6) {
      if (!invoiceNameTo.trim()) return 'Billing contact name (To) is required';
      if (!invoiceEmailTo.trim()) return 'Billing contact email (To) is required';
      if (!isEmailValid(invoiceEmailTo.trim())) return 'Please enter a valid billing email';
    }
    return null;
  };

  const handleSkipAndAdd = () => {
    const err = validateStep(step);
    if (err) { toast.error(err); return; }
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleNext = () => {
    const err = validateStep(step);
    if (err) { toast.error(err); return; }
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Practice Facility</DialogTitle>
        </DialogHeader>

        {/* Progress section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Step {step + 1} of {totalSteps} — {STEPS[step].label}</span>
           {step > 0 && step !== 4 && step !== 5 && step !== 6 && (
              <button
                type="button"
                onClick={handleSkipAndAdd}
                className="flex items-center gap-1 text-xs text-primary hover:underline transition-colors"
              >
                <SkipForward className="h-3 w-3" />
                Skip & add later
              </button>
            )}
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground">{STEPS[step].description}</p>
        </div>

        {/* Step content */}
        <div className="space-y-3 min-h-[200px]">
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label>Name <span className="text-destructive">*</span></Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Practice facility name" autoFocus />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={v => setStatus(v as FacilityStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prospect">Prospect</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Full address" />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes..." rows={3} />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <p className="text-sm text-muted-foreground">Set shift rates for this facility. You can also configure these later.</p>
              <RatesEditor rates={rates} onChange={setRates} showCard={false} compact />
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm text-muted-foreground">Store login credentials and tech access info for this facility.</p>
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

          {step === 3 && (
            <>
              <p className="text-sm text-muted-foreground">General clinic access details — door codes, parking, key info, etc.</p>
              <div className="space-y-2">
                <Label>Clinic Access Information</Label>
                <Textarea value={clinicAccess} onChange={e => setClinicAccess(e.target.value)} placeholder="Door codes, parking instructions, key pickup, building access..." rows={5} />
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <p className="text-sm text-muted-foreground">Add the scheduling contact for shift confirmations. This person will receive monthly and pre-shift confirmation emails.</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Contact Name <span className="text-destructive">*</span></Label>
                  <Input value={schedulingContactName} onChange={e => setSchedulingContactName(e.target.value)} placeholder="Practice Manager" />
                </div>
                <div className="space-y-2">
                  <Label>Contact Email <span className="text-destructive">*</span></Label>
                  <Input type="email" value={schedulingContactEmail} onChange={e => setSchedulingContactEmail(e.target.value)} placeholder="manager@clinic.com" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">This contact will be used for shift confirmations in the Schedule module. You can configure auto-send settings later.</p>
            </>
          )}

          {step === 5 && (
            <>
              <p className="text-sm text-muted-foreground">Choose how often invoices should be generated for this facility.</p>
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
                  <p className="text-xs text-muted-foreground">Billing week runs Monday through Sunday. Draft generates on the morning of your last scheduled shift that week.</p>
                )}
                {billingCadence === 'monthly' && (
                  <p className="text-xs text-muted-foreground">Draft generates on the morning of your last scheduled shift of the month.</p>
                )}
                {billingCadence === 'daily' && (
                  <p className="text-xs text-muted-foreground">A draft invoice is generated each morning you have a scheduled shift.</p>
                )}
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <Label>Auto-generate invoices</Label>
                  <p className="text-xs text-muted-foreground">Draft invoices are generated automatically during the early morning system run.</p>
                </div>
                <Switch checked={autoGenerateInvoices} onCheckedChange={setAutoGenerateInvoices} />
              </div>

              {autoGenerateInvoices && !invoiceEmailTo.trim() && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">Add a billing contact in the next step to enable invoice generation and sending.</p>
                </div>
              )}
            </>
          )}

          {step === 6 && (
            <>
              <p className="text-sm text-muted-foreground">Invoice settings, email recipients, and payment terms for this facility.</p>
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
              <p className="text-xs text-muted-foreground">This email will be used as the billing contact when invoices are created.</p>
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
              <div className="space-y-2">
                <Label>Invoice Prefix</Label>
                <Input value={invoicePrefix} onChange={e => setInvoicePrefix(e.target.value.toUpperCase())} placeholder={name ? getInitials(name) : 'INV'} />
                <p className="text-xs text-muted-foreground">
                  Defaults to facility initials. e.g. {invoicePrefix || (name ? getInitials(name) : 'INV')}-2026-001
                </p>
              </div>
              <div className="space-y-2">
                <Label>Invoice Due (days)</Label>
                <Input type="number" value={invoiceDueDays} onChange={e => setInvoiceDueDays(Number(e.target.value))} min={1} placeholder="15" />
                <p className="text-xs text-muted-foreground">
                  Number of days after invoice date that payment is due. Default: Net 15.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between pt-2">
          <Button type="button" variant="ghost" size="sm" onClick={handleBack} disabled={step === 0}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <Button type="button" size="sm" onClick={handleNext}>
            {step === totalSteps - 1 ? 'Add Facility' : (
              <>Next <ArrowRight className="ml-1 h-4 w-4" /></>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
