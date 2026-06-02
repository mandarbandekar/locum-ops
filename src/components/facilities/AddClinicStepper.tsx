import { useState, useImperativeHandle, forwardRef, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useData } from '@/contexts/DataContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useClinicConfirmations } from '@/hooks/useClinicConfirmations';
import { generateId } from '@/lib/businessLogic';
import { toast } from 'sonner';
import { trackOnboarding } from '@/lib/onboardingAnalytics';
import { recordOnboardingStatusEvent } from '@/lib/onboardingStatusLog';
import {
  Building2, DollarSign, UserCheck, CalendarClock,
  Check, ArrowRight, ArrowLeft, SkipForward, Sparkles, CalendarIcon,
} from 'lucide-react';
import { GooglePlacesAutocomplete } from '@/components/GooglePlacesAutocomplete';
import type { PlaceSelection } from '@/components/GooglePlacesAutocomplete';
import type { BillingCadence } from '@/lib/invoiceBillingDefaults';
import { RatesEditor, ratesToTermsFields, type RateEntry } from '@/components/facilities/RatesEditor';
import { buildDefaultRatesFromRateEntries, inferBillingPreference } from '@/lib/onboardingRateMapping';
import { BreakPolicySelector } from '@/components/facilities/BreakPolicySelector';
import { EngagementSelector } from '@/components/facilities/EngagementSelector';
import type { EngagementType, TaxFormType } from '@/lib/engagementOptions';
import { GuidedStep } from '@/components/onboarding/GuidedStep';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { US_TIMEZONES, isSupportedUsTz, coerceToUsTz, labelForTz } from '@/lib/usTimezones';
import tzlookup from 'tz-lookup';
import { format, addDays, endOfMonth } from 'date-fns';

function parseDateOnly(s: string | null | undefined): Date | undefined {
  if (!s) return undefined;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}
function formatDateOnly(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export interface AddClinicStepperHandle {
  /** Returns the created facility id, or null on validation failure. */
  submit: () => Promise<string | null>;
  /** True when all required fields are filled for the current path. */
  canSave: boolean;
  /** Go to next step (or run submit on the last step). */
  next: () => void;
  /** Go to previous step. */
  back: () => void;
  /** Skip current step (only allowed for non-required steps). */
  skip: () => void;
  /** 1-indexed current step. */
  step: number;
  /** Total visible steps for the active engagement path. */
  totalSteps: number;
  /** Whether back is allowed. */
  canBack: boolean;
  /** Whether skip is allowed for current step. */
  canSkip: boolean;
  /** Label for the primary CTA on the current step. */
  primaryLabel: string;
}

interface Props {
  /** Called once the facility is saved. Receives the new facility id. */
  onSaved: (facilityId: string, facilityName: string) => void;
  /** Render a compact header inside the stepper (omit if parent renders one). */
  showHeader?: boolean;
  /** When true, hides the Rates step (used in onboarding when rates come from the user's Rate Card). */
  hideRatesStep?: boolean;
  /** Pre-populate the stepper's internal `rates` state — typically from the user's Rate Card. */
  defaultRates?: RateEntry[];
}

const BILLING_CADENCES: { value: BillingCadence; label: string; example: string; recommended?: boolean }[] = [
  { value: 'daily', label: 'After each shift is completed', example: 'Receive a draft invoice the morning after each shift.' },
  { value: 'weekly', label: 'After all shifts for the week are completed', example: 'One invoice per week (Mon–Sun), drafted on your last shift of the week.' },
  { value: 'biweekly', label: 'Every two weeks (aligned to clinic payroll)', example: 'One invoice every 14 days, drafted on your last shift of each period. Common for corporate clinics.' },
  { value: 'monthly', label: 'After all shifts for the month are completed', example: 'One invoice at the end of the month. This is the most common option for relief work.' },
];

const NET_TERMS = [7, 14, 15, 30, 45, 60, 0];

function getInitials(text: string): string {
  return text.split(/\s+/).map(w => w[0]).filter(Boolean).join('').toUpperCase().slice(0, 4) || 'INV';
}

function previewDueDate(cadence: BillingCadence, netDays: number): string {
  const today = new Date();
  let invoiceDate: Date;
  if (cadence === 'monthly') invoiceDate = endOfMonth(today);
  else if (cadence === 'weekly') invoiceDate = addDays(today, 7 - today.getDay());
  else if (cadence === 'biweekly') invoiceDate = addDays(today, 14);
  else invoiceDate = today;
  return format(addDays(invoiceDate, netDays), 'MMM d, yyyy');
}

export const AddClinicStepper = forwardRef<AddClinicStepperHandle, Props>(function AddClinicStepper(
  { onSaved, showHeader = true, hideRatesStep = false, defaultRates },
  ref,
) {
  const { addFacility, updateTerms, facilities } = useData();
  const { profile, updateProfile } = useUserProfile();
  const { saveSettings: saveConfirmationSettings } = useClinicConfirmations();

  // ── Step 1: Identity ──
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [clinicSearchValue, setClinicSearchValue] = useState('');
  const [manualEntry, setManualEntry] = useState(false);
  const [clinicSelected, setClinicSelected] = useState(false);
  // Clinic timezone is explicit at creation. Default to the user's profile tz
  // if it's a supported US zone, else the browser tz if supported, else ET.
  // The user MUST be able to override this before saving so a CT-based vet
  // adding a CT clinic from a PT device doesn't end up with a PT-stamped clinic.
  const initialTz = (() => {
    const prof = profile?.timezone;
    if (prof && isSupportedUsTz(prof)) return prof;
    const browser = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : '';
    if (browser && isSupportedUsTz(browser)) return browser;
    return 'America/New_York';
  })();
  const [timezone, setTimezone] = useState<string>(initialTz);
  // When we pre-fill the timezone from a place's coordinates, remember the
  // address-derived tz so we can show a soft "address suggests X" warning if
  // the user later picks something different in the Select.
  const [addressDerivedTz, setAddressDerivedTz] = useState<string | null>(null);
  const [tzAutoFilled, setTzAutoFilled] = useState(false);

  // Resolve a clinic timezone from an address selection. Uses the offline
  // tz-lookup table (no API call) and collapses sub-zones to one of our 7
  // supported US zones. Returns null if the address is outside the US.
  const tzFromCoords = (lat: number | null | undefined, lng: number | null | undefined): string | null => {
    if (typeof lat !== 'number' || typeof lng !== 'number') return null;
    try {
      const iana = tzlookup(lat, lng);
      return coerceToUsTz(iana);
    } catch {
      return null;
    }
  };

  // ── Step 2: Engagement ──
  const [engagementType, setEngagementType] = useState<EngagementType>('direct');
  const [sourceName, setSourceName] = useState('');
  const [taxFormType, setTaxFormType] = useState<TaxFormType>('1099');
  const [generatesInvoices, setGeneratesInvoices] = useState(true);

  // ── Step 3: Rates ──
  const [rates, setRates] = useState<RateEntry[]>(defaultRates ?? []);
  const [defaultBreakMinutes, setDefaultBreakMinutes] = useState<number | null>(null);

  // ── Step 4: Billing & Contacts ──
  const [billingCadence, setBillingCadence] = useState<BillingCadence>('monthly');
  const [anchorDate, setAnchorDate] = useState<string | null>(null);
  const [invoiceDueDays, setInvoiceDueDays] = useState(15);
  const [schedulingContactName, setSchedulingContactName] = useState('');
  const [schedulingContactEmail, setSchedulingContactEmail] = useState('');
  const [invoiceNameTo, setInvoiceNameTo] = useState('');
  const [invoiceEmailTo, setInvoiceEmailTo] = useState('');
  const [sameAsScheduling, setSameAsScheduling] = useState(false);

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  // Tracks whether the user has acknowledged the "no rates yet" warning so a
  // second Save click proceeds rather than bouncing them to step 3 again.
  const [acknowledgedNoRates, setAcknowledgedNoRates] = useState(false);

  const isDirect = engagementType === 'direct';
  const directInvoicing = isDirect && generatesInvoices;
  // Visible step list. The Rates step (#3) can be hidden via `hideRatesStep`.
  // The Billing step (#4) is direct-only.
  // Rates are collected for every engagement type so the user can save reusable
  // rates (mirrored to their Rate Card on first clinic) even when invoicing is
  // handled by a platform/agency.
  const visibleSteps: number[] = useMemo(() => {
    const arr = [1, 2];
    if (!hideRatesStep) arr.push(3);
    if (directInvoicing) arr.push(4);
    return arr;
  }, [hideRatesStep, directInvoicing]);
  const totalSteps = visibleSteps.length;
  const currentVisibleIndex = visibleSteps.indexOf(step); // 0-based; -1 if step not visible

  const handleClinicPlaceSelect = (selection: PlaceSelection) => {
    setName(selection.name);
    setAddress(selection.formatted_address || selection.description);
    setClinicSelected(true);
    setClinicSearchValue(selection.name);

    // Auto-resolve the clinic's timezone from its address. This stops
    // wrong-region clinics from inheriting the user's profile tz silently
    // (which is what caused the April PT-default bug for non-PT users).
    const derived = tzFromCoords(selection.lat, selection.lng);
    if (derived) {
      setAddressDerivedTz(derived);
      setTimezone(derived);
      setTzAutoFilled(true);
    }
  };

  const handleAddressPlaceSelect = (selection: PlaceSelection) => {
    setAddress(selection.formatted_address || selection.description);
    const derived = tzFromCoords(selection.lat, selection.lng);
    if (derived) {
      setAddressDerivedTz(derived);
      setTimezone(derived);
      setTzAutoFilled(true);
    }
  };

  const effectiveBillingName = sameAsScheduling ? schedulingContactName : invoiceNameTo;
  const effectiveBillingEmail = sameAsScheduling ? schedulingContactEmail : invoiceEmailTo;

  const canSave = useMemo(() => {
    if (!name.trim()) return false;
    if (engagementType !== 'direct' && !sourceName.trim()) return false;
    if (directInvoicing && billingCadence === 'biweekly' && !anchorDate) return false;
    return !saving;
  }, [name, engagementType, sourceName, saving, directInvoicing, billingCadence, anchorDate]);

  const handleSave = async (): Promise<string | null> => {
    if (!name.trim()) {
      toast.error('Please enter a clinic name');
      setStep(1);
      return null;
    }
    if (engagementType !== 'direct' && !sourceName.trim()) {
      toast.error('Please select the platform or agency');
      setStep(2);
      return null;
    }
    if (directInvoicing && billingCadence === 'biweekly' && !anchorDate) {
      toast.error('Pick the first pay period start date for biweekly billing.');
      setStep(4);
      return null;
    }

    // Duplicate-clinic guard — prevents re-creating a clinic the user already added
    // (e.g. after navigating Back during onboarding and re-submitting the form).
    const trimmedName = name.trim().toLowerCase();
    const trimmedAddress = address.trim().toLowerCase();
    const duplicate = facilities.find(f => {
      const existingName = (f.name || '').trim().toLowerCase();
      const existingAddress = (f.address || '').trim().toLowerCase();
      if (existingName !== trimmedName) return false;
      // If both have an address, require it to match too. If neither has one,
      // a name-only match is enough to flag a duplicate.
      if (trimmedAddress && existingAddress) return existingAddress === trimmedAddress;
      return true;
    });
    if (duplicate) {
      toast.error('You already added this clinic', {
        description: `"${duplicate.name}" is already in your workspace. Continuing with the existing one.`,
      });
      onSaved(duplicate.id, duplicate.name);
      return duplicate.id;
    }

    setSaving(true);
    try {
      const prefix = getInitials(name);
      const rateFields = ratesToTermsFields(rates);
      const effectiveTaxForm: TaxFormType | null =
        engagementType === 'third_party' ? taxFormType : null;

      const facility = await addFacility({
        name: name.trim(),
        status: 'active',
        address,
        timezone,
        notes: '',
        outreach_last_sent_at: null,
        tech_computer_info: '',
        tech_wifi_info: '',
        tech_pims_info: '',
        clinic_access_info: '',
        invoice_prefix: (prefix || 'INV').replace(/\s+/g, '') || 'INV',
        invoice_due_days: invoiceDueDays,
        invoice_name_to: directInvoicing ? effectiveBillingName.trim() : '',
        invoice_email_to: directInvoicing ? effectiveBillingEmail.trim() : '',
        invoice_name_cc: '',
        invoice_email_cc: '',
        invoice_name_bcc: '',
        invoice_email_bcc: '',
        billing_cadence: billingCadence,
        billing_cycle_anchor_date: billingCadence === 'biweekly' ? anchorDate : null,
        billing_week_end_day: 'saturday',
        auto_generate_invoices: directInvoicing,
        generates_invoices: directInvoicing,
        engagement_type: engagementType,
        source_name: isDirect ? null : sourceName.trim() || null,
        tax_form_type: effectiveTaxForm,
        default_break_minutes: defaultBreakMinutes,
      });

      recordOnboardingStatusEvent({
        type: 'clinic_create_succeeded',
        clinicName: name.trim(),
        facilityId: facility.id,
      });

      if (rates.length > 0) {
        try {
          await updateTerms({
            id: generateId(),
            facility_id: facility.id,
            ...rateFields,
            cancellation_policy_text: '',
            overtime_policy_text: '',
            late_payment_policy_text: '',
            special_notes: '',
          });
          recordOnboardingStatusEvent({
            type: 'rates_save_succeeded',
            clinicName: name.trim(),
            facilityId: facility.id,
            rateCount: rates.length,
          });
        } catch (e) {
          const err = e as { message?: string; code?: string } | null;
          console.error('Failed to save clinic rates', e);
          recordOnboardingStatusEvent({
            type: 'rates_save_failed',
            clinicName: name.trim(),
            facilityId: facility.id,
            rateCount: rates.length,
            errorMessage: err?.message ?? 'Could not save rates',
            errorCode: err?.code,
          });
          toast.error('Could not save rates for this clinic', {
            description: 'Your clinic was created, but the rates didn\'t save. Please try the Rates step again.',
          });
          // Bounce back to the Rates step so the user can retry, instead of
          // silently advancing to "Add Shifts" with no rates persisted.
          setStep(3);
          return null;
        }
      }

      // Seed the user's reusable Rate Card from this clinic's rates when the
      // user has not yet set one up. This prevents the ShiftFormDialog from
      // asking the user to "add a rate" later when rates are clearly already
      // configured at the clinic level. Non-destructive: only fires when
      // `profile.default_rates` is empty.
      if (rates.length > 0 && (profile?.default_rates?.length ?? 0) === 0) {
        try {
          await updateProfile({
            default_rates: buildDefaultRatesFromRateEntries(rates),
            default_billing_preference: inferBillingPreference(rates),
          });
        } catch (e) {
          // Non-fatal: clinic + terms were saved. Log only.
          console.warn('Failed to seed default Rate Card from clinic rates', e);
        }
      }

      if (isDirect && schedulingContactName.trim() && schedulingContactEmail.trim()) {
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
      onSaved(facility.id, name.trim());
      return facility.id;
    } catch (e) {
      const err = e as { message?: string; code?: string } | null;
      recordOnboardingStatusEvent({
        type: 'clinic_create_failed',
        clinicName: name.trim(),
        errorMessage: err?.message ?? 'Failed to save clinic',
        errorCode: err?.code,
      });
      toast.error('Failed to save clinic');
      return null;
    } finally {
      setSaving(false);
    }
  };

  // Step 1 (identity) is required: name. Step 2 (engagement): required for non-direct (source).
  // Step 3 (rates): skippable. Step 4 (billing): skippable; defaults applied.
  const canSkip = step === 3 || (step === 4 && directInvoicing);
  const canBack = currentVisibleIndex > 0;

  const isLastStep = currentVisibleIndex === visibleSteps.length - 1;
  const primaryLabel = isLastStep ? 'Save Clinic' : 'Continue';

  const validateStep = (s: number): string | null => {
    if (s === 1 && !name.trim()) return 'Please enter a clinic name';
    if (s === 2 && engagementType !== 'direct' && !sourceName.trim()) {
      return 'Please select the platform or agency';
    }
    return null;
  };

  const next = async () => {
    const err = validateStep(step);
    if (err) { toast.error(err); return; }
    if (isLastStep) {
      // Soft-required Rates step for direct clinics: if the user reached the
      // end with zero rates, bounce them back to step 3 once with a clear
      // warning. A second Save click will proceed (so they can intentionally
      // defer rate entry to per-shift logging).
      if (isDirect && rates.length === 0 && !acknowledgedNoRates) {
        const ratesStepVisible = visibleSteps.includes(3);
        setAcknowledgedNoRates(true);
        trackOnboarding('onboarding_clinic_saved_without_rates', {
          facility_name: name.trim(),
          step_visible: ratesStepVisible,
        });
        if (ratesStepVisible) {
          setStep(3);
          toast('No rate set for this clinic yet', {
            description: 'Add a rate now so logged shifts use the right amount, or click Save Clinic again to skip and add it later.',
          });
          return;
        }
      }
      await handleSave();
      return;
    }
    // Advance to the next visible step
    const nextStep = visibleSteps[currentVisibleIndex + 1];
    if (nextStep) setStep(nextStep);
  };

  const back = () => {
    const prev = visibleSteps[currentVisibleIndex - 1];
    if (prev) setStep(prev);
  };

  const skip = () => {
    if (!canSkip) return;
    if (isLastStep) {
      handleSave();
      return;
    }
    const nextStep = visibleSteps[currentVisibleIndex + 1];
    if (nextStep) setStep(nextStep);
  };

  useImperativeHandle(ref, () => ({
    submit: handleSave,
    canSave,
    next,
    back,
    skip,
    step,
    totalSteps,
    canBack,
    canSkip,
    primaryLabel,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [canSave, step, totalSteps, canBack, canSkip, primaryLabel, name, engagementType, sourceName, rates, billingCadence, invoiceDueDays, schedulingContactName, schedulingContactEmail, invoiceNameTo, invoiceEmailTo, sameAsScheduling, address, taxFormType, acknowledgedNoRates]);

  // Rendered step number depends on visibility (rates/billing steps may be hidden).
  const visibleStepNumber = currentVisibleIndex + 1;

  return (
    <div className="space-y-5">
      {showHeader && (
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Step {visibleStepNumber} of {totalSteps}
          </p>
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1 w-8 rounded-full transition-colors',
                  i <= currentVisibleIndex ? 'bg-primary' : 'bg-muted',
                )}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Step 1: Clinic Identity ── */}
      {step === 1 && (
        <GuidedStep
          title="Clinic Identity"
          subtitle="Start with the basics — name and address."
          icon={Building2}
        >
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
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Clinic name" autoFocus={manualEntry} />
              </div>
              <div className="space-y-1.5">
                <Label>Address</Label>
                <GooglePlacesAutocomplete
                  value={address}
                  onChange={setAddress}
                  placeholder="Full address"
                  onPlaceSelect={handleAddressPlaceSelect}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Clinic timezone <span className="text-destructive">*</span></Label>
                <Select
                  value={timezone}
                  onValueChange={(v) => { setTimezone(v); setTzAutoFilled(false); }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {US_TIMEZONES.map(tz => (
                      <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {tzAutoFilled && addressDerivedTz === timezone ? (
                  <p className="text-[11px] text-muted-foreground">
                    Set from the clinic's address ({labelForTz(addressDerivedTz)}). Change it if this isn't right.
                  </p>
                ) : addressDerivedTz && addressDerivedTz !== timezone ? (
                  <p className="text-[11px] text-amber-600 dark:text-amber-500">
                    The clinic's address suggests {labelForTz(addressDerivedTz)}. Double-check before saving.
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Shift times you log for this clinic are saved and displayed in this timezone. Set it to the clinic's local time, not yours.
                  </p>
                )}
              </div>
            </>
          )}
        </GuidedStep>
      )}



      {/* ── Step 2: How You Work With Them ── */}
      {step === 2 && (
        <GuidedStep
          title="How You Work With Them"
          subtitle="Tell us how this clinic pays you so we set up the right workflow."
          icon={UserCheck}
          preview={
            isDirect ? (
              <p className="text-[12px] text-foreground">
                <span className="font-medium">You'll be billing this clinic directly. </span>
                <span className="text-muted-foreground">We'll generate draft invoices from your logged shifts.</span>
              </p>
            ) : (
              <p className="text-[12px] text-foreground">
                <span className="font-medium">{sourceName.trim() || 'The platform'} handles your billing. </span>
                <span className="text-muted-foreground">
                  We'll skip invoicing and just track shifts and income for taxes.
                </span>
              </p>
            )
          }
        >
          <EngagementSelector
            engagementType={engagementType}
            onEngagementTypeChange={setEngagementType}
            sourceName={sourceName}
            onSourceNameChange={setSourceName}
            taxFormType={taxFormType}
            onTaxFormTypeChange={setTaxFormType}
            generatesInvoices={generatesInvoices}
            onGeneratesInvoicesChange={setGeneratesInvoices}
            compact
          />
        </GuidedStep>
      )}

      {/* ── Step 3: Your Rates ── */}
      {step === 3 && (
        <GuidedStep
          title="Your Rates"
          subtitle="Save the rates you charge here so logging shifts is a click, not a calculation."
          icon={DollarSign}
        >
          <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-[12px] text-muted-foreground">
            <span className="font-medium text-foreground">Tip · </span>
            most relief vets start with one Weekday day rate (e.g. $850 flat). You can add Weekend, Holiday,
            or hourly rates anytime.
          </div>

          <RatesEditor rates={rates} onChange={setRates} showCard={false} compact />

          <div className="space-y-2 pt-3 border-t border-border/60">
            <Label className="text-sm font-semibold text-foreground normal-case tracking-normal">Break policy</Label>
            <BreakPolicySelector
              value={defaultBreakMinutes}
              onChange={setDefaultBreakMinutes}
              helper="This is the default for new shifts at this clinic. You can override per shift."
              compact
            />
          </div>

          {rates.length === 0 && (
            <p className="text-[11px] text-muted-foreground italic">
              Skip — I'll add rates later from the clinic page.
            </p>
          )}
        </GuidedStep>
      )}

      {/* ── Step 4: Billing & Contacts (direct only) ── */}
      {step === 4 && isDirect && (
        <GuidedStep
          title="Billing & Contacts"
          subtitle="How often we draft invoices, when payment is due, and who receives them."
          icon={CalendarClock}
          preview={
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Sample invoice header</p>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-[13px] font-mono font-semibold text-foreground">
                  {getInitials(name || 'INV')}-001
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Bill to: {effectiveBillingName.trim() || '—'} · Due {previewDueDate(billingCadence, invoiceDueDays)}
                </span>
              </div>
            </div>
          }
        >
          {/* Section A — Cadence */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground normal-case tracking-normal">Billing cadence — How often do you want to bill this clinic?</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {BILLING_CADENCES.map(c => {
                const selected = billingCadence === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setBillingCadence(c.value)}
                    className={cn(
                      'text-left rounded-lg border p-3 transition-colors',
                      selected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                        : 'border-border hover:border-primary/40 hover:bg-muted/40',
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium">{c.label}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{c.example}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section B — Net terms */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground normal-case tracking-normal">Payment terms — What is the required timeframe for payment?</Label>
            <div className="flex flex-wrap gap-1.5">
              {NET_TERMS.map(d => {
                const selected = invoiceDueDays === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setInvoiceDueDays(d)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                      selected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {d === 0 ? 'Due upon receipt' : `${d} days`}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Most relief vets give clinics 15 to 30 days to pay.
            </p>
          </div>

          {/* Section C — Contacts */}
          <div className="space-y-3 border-t border-border pt-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Scheduling contact</Label>
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

            <div className="border-t border-border/50 pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Billing contact</Label>
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
              {!sameAsScheduling ? (
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
              ) : (
                <p className="text-xs text-muted-foreground">
                  Invoices will be sent to {schedulingContactName} ({schedulingContactEmail})
                </p>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">You can add or update contacts anytime from the clinic detail page.</p>
          </div>
        </GuidedStep>
      )}
    </div>
  );
});

/**
 * Standalone footer matching the stepper's actions. Most callers will render
 * their own footer (e.g. onboarding sticky CTA) and call the imperative
 * handle's `next/back/skip` directly — this is provided for the dialog use case.
 */
export function AddClinicStepperFooter({
  handle,
}: {
  handle: AddClinicStepperHandle | null;
}) {
  if (!handle) return null;
  return (
    <div className="flex items-center justify-between gap-2 pt-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handle.back}
        disabled={!handle.canBack}
        className={cn(!handle.canBack && 'invisible')}
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>
      <div className="flex items-center gap-2">
        {handle.canSkip && (
          <Button type="button" variant="outline" size="sm" onClick={handle.skip}>
            <SkipForward className="h-3.5 w-3.5 mr-1" /> Skip — I'll add this later
          </Button>
        )}
        <Button type="button" size="sm" onClick={handle.next} disabled={!handle.canSave && handle.step === 1}>
          {handle.primaryLabel === 'Save Clinic' ? (
            <><Check className="h-3.5 w-3.5 mr-1" /> Save Clinic</>
          ) : (
            <>{handle.primaryLabel} <ArrowRight className="h-4 w-4 ml-1" /></>
          )}
        </Button>
      </div>
    </div>
  );
}

// Re-export icon for parents that want to render a header.
export const StepperIcons = { Sparkles };
