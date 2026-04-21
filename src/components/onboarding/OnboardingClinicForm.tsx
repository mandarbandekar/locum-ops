import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useData } from '@/contexts/DataContext';
import { useClinicConfirmations } from '@/hooks/useClinicConfirmations';
import { generateId } from '@/lib/businessLogic';
import { toast } from 'sonner';
import {
  Building2, DollarSign, UserCheck, Settings2, Info,
} from 'lucide-react';
import { GooglePlacesAutocomplete } from '@/components/GooglePlacesAutocomplete';
import type { PlaceSelection } from '@/components/GooglePlacesAutocomplete';
import type { BillingCadence } from '@/lib/invoiceBillingDefaults';
import { RatesEditor, ratesToTermsFields, type RateEntry } from '@/components/facilities/RatesEditor';
import { EngagementSelector } from '@/components/facilities/EngagementSelector';
import type { EngagementType, TaxFormType } from '@/lib/engagementOptions';

interface Props {
  onSaved: () => void;
  /** Expose save handler + disabled state so parent can render sticky CTA */
  onRegisterSave?: (handler: () => Promise<void>, disabled: boolean) => void;
}

export function OnboardingClinicForm({ onSaved }: Props) {
  const { addFacility, updateTerms } = useData();
  const { saveSettings: saveConfirmationSettings } = useClinicConfirmations();

  const [name, setName] = useState('');
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
  const [saving, setSaving] = useState(false);

  const formRef = useRef<HTMLDivElement>(null);

  function getInitials(text: string): string {
    return text.split(/\s+/).map(w => w[0]).filter(Boolean).join('').toUpperCase().slice(0, 4) || 'INV';
  }

  const handleClinicPlaceSelect = (selection: PlaceSelection) => {
    setName(selection.name);
    setAddress(selection.formatted_address || selection.description);
    setClinicSelected(true);
    setClinicSearchValue(selection.name);
  };

  const effectiveBillingName = sameAsScheduling ? schedulingContactName : invoiceNameTo;
  const effectiveBillingEmail = sameAsScheduling ? schedulingContactEmail : invoiceEmailTo;

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a clinic name');
      return;
    }
    if (engagementType !== 'direct' && !sourceName.trim()) {
      toast.error(engagementType === 'w2' ? 'Please select your employer' : 'Please select the platform or agency');
      return;
    }
    setSaving(true);
    try {
      const isDirect = engagementType === 'direct';
      const prefix = getInitials(name);
      const rateFields = ratesToTermsFields(rates);
      const effectiveTaxForm: TaxFormType | null =
        engagementType === 'w2' ? 'w2' : engagementType === 'third_party' ? taxFormType : null;

      const facility = await addFacility({
        name: name.trim(),
        status: 'active',
        address,
        timezone: 'America/Los_Angeles',
        notes: '',
        outreach_last_sent_at: null,
        tech_computer_info: '',
        tech_wifi_info: '',
        tech_pims_info: '',
        clinic_access_info: '',
        invoice_prefix: prefix,
        invoice_due_days: invoiceDueDays,
        invoice_name_to: isDirect ? effectiveBillingName.trim() : '',
        invoice_email_to: isDirect ? effectiveBillingEmail.trim() : '',
        invoice_name_cc: '',
        invoice_email_cc: '',
        invoice_name_bcc: '',
        invoice_email_bcc: '',
        billing_cadence: billingCadence,
        billing_cycle_anchor_date: null,
        billing_week_end_day: 'saturday',
        auto_generate_invoices: isDirect,
        engagement_type: engagementType,
        source_name: isDirect ? null : sourceName.trim() || null,
        tax_form_type: effectiveTaxForm,
      });

      if (engagementType !== 'w2' && rates.length > 0) {
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

      if (isDirect) {
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

      toast.success(`${name} added!`);
      onSaved();
    } catch {
      toast.error('Failed to save clinic');
    } finally {
      setSaving(false);
    }
  };

  // Expose save handler for parent sticky CTA
  const canSave = name.trim().length > 0 && !saving;

  return (
    <TooltipProvider delayDuration={0}>
      <div ref={formRef} className="space-y-5">
        {/* ── SECTION: Clinic Details ── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Clinic Details</p>
          </div>

          {!manualEntry && !clinicSelected ? (
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
          ) : (
            <>
              {clinicSelected && (
                <button
                  type="button"
                  onClick={() => { setClinicSelected(false); setName(''); setAddress(''); setClinicSearchValue(''); }}
                  className="text-xs text-primary hover:underline"
                >
                  ← Search again
                </button>
              )}
              <div className="space-y-1.5">
                <Label>Clinic name <span className="text-destructive">*</span></Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Practice facility name" autoFocus={manualEntry} />
              </div>
              <div className="space-y-1.5">
                <Label>Address</Label>
                <GooglePlacesAutocomplete value={address} onChange={setAddress} placeholder="Full address" />
              </div>
            </>
          )}

          {/* Engagement type selector */}
          <div className="border-t border-border pt-4">
            <EngagementSelector
              engagementType={engagementType}
              onEngagementTypeChange={setEngagementType}
              sourceName={sourceName}
              onSourceNameChange={setSourceName}
              taxFormType={taxFormType}
              onTaxFormTypeChange={setTaxFormType}
              compact
            />
          </div>

          {engagementType !== 'w2' && (
            <div className="space-y-1.5">
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
          )}
        </div>

        {/* ── SECTION: Contacts (direct only) ── */}
        {engagementType === 'direct' && (
        <div className="space-y-4 border-t border-border pt-4">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Contacts</p>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            Who handles scheduling and billing here? Having this on file makes it easy to send invoices and confirmations when you're ready.
          </p>

          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Scheduling Contact</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Name</Label>
                <Input value={schedulingContactName} onChange={e => setSchedulingContactName(e.target.value)} placeholder="Practice Manager" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input type="email" value={schedulingContactEmail} onChange={e => setSchedulingContactEmail(e.target.value)} placeholder="manager@clinic.com" />
              </div>
            </div>
          </div>

          <div className="border-t border-border/50 pt-3 space-y-3">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Name</Label>
                  <Input value={invoiceNameTo} onChange={e => setInvoiceNameTo(e.target.value)} placeholder="Billing Department" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
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

          <p className="text-xs text-muted-foreground">You can add or update contacts anytime from the clinic detail page.</p>
        </div>

        {/* ── SECTION: Billing Preferences ── */}
        <div className="space-y-4 border-t border-border pt-4">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Billing Preferences</p>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            Set your billing preferences for this clinic. LocumOps uses these to generate draft invoices from your logged shifts.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Label>Billing cadence</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-muted-foreground hover:text-foreground">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[260px] text-xs">
                    How often LocumOps bundles your shifts into a single invoice. Monthly means one invoice per clinic at the end of each month.
                  </TooltipContent>
                </Tooltip>
              </div>
              <Select value={billingCadence} onValueChange={(v: BillingCadence) => setBillingCadence(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly (Mon–Sun)</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
              {billingCadence === 'monthly' && (
                <p className="text-xs text-muted-foreground">Draft generates after your last shift of the month.</p>
              )}
              {billingCadence === 'weekly' && (
                <p className="text-xs text-muted-foreground">Billing week runs Monday through Sunday.</p>
              )}
              {billingCadence === 'daily' && (
                <p className="text-xs text-muted-foreground">A draft invoice each morning you have a shift.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Label>Payment terms</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-muted-foreground hover:text-foreground">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[260px] text-xs">
                    How many days the clinic has to pay after receiving your invoice. Net 15 = 15 days. If you're not sure, Net 15 is standard for relief vet work.
                  </TooltipContent>
                </Tooltip>
              </div>
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
        </div>
      </div>

      {/* Hidden button for parent to trigger save */}
      <button
        id="onboarding-clinic-save"
        type="button"
        onClick={handleSave}
        disabled={!canSave}
        className="hidden"
        data-can-save={canSave}
        data-saving={saving}
      />
    </TooltipProvider>
  );
}
