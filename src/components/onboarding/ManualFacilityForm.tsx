import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

import { ArrowRight, DollarSign, Loader2, CalendarIcon } from 'lucide-react';
import { GooglePlacesAutocomplete } from '@/components/GooglePlacesAutocomplete';
import type { PlaceSelection } from '@/components/GooglePlacesAutocomplete';
import type { ManualFacilityInput } from '@/hooks/useManualSetup';
import type { BillingCadence } from '@/lib/invoiceBillingDefaults';
import { EngagementSelector } from '@/components/facilities/EngagementSelector';
import type { EngagementType, TaxFormType } from '@/lib/engagementOptions';
import type { RateKind } from '@/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { computeBiweeklyWindows } from '@/lib/biweeklyHelpers';
import { toast } from 'sonner';

function parseDateOnly(s: string | null | undefined): Date | undefined {
  if (!s) return undefined;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}
function formatDateOnly(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

interface Props {
  onSave: (input: ManualFacilityInput) => Promise<any>;
  saving: boolean;
}

export function ManualFacilityForm({ onSave, saving }: Props) {
  const [name, setName] = useState('');
  const [billingNameTo, setBillingNameTo] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [address, setAddress] = useState('');
  const [weekdayRate, setWeekdayRate] = useState('');
  const [weekdayRateKind, setWeekdayRateKind] = useState<RateKind>('flat');
  const [billingCadence, setBillingCadence] = useState<BillingCadence>('monthly');
  const [anchorDate, setAnchorDate] = useState<string | null>(null);
  const [engagementType, setEngagementType] = useState<EngagementType>('direct');
  const [sourceName, setSourceName] = useState('');
  const [taxFormType, setTaxFormType] = useState<TaxFormType>('1099');

  const [clinicSearchValue, setClinicSearchValue] = useState('');
  const [manualEntry, setManualEntry] = useState(false);
  const [clinicSelected, setClinicSelected] = useState(false);

  const handleClinicPlaceSelect = (selection: PlaceSelection) => {
    setName(selection.name);
    setAddress(selection.formatted_address || selection.description);
    setClinicSelected(true);
    setClinicSearchValue(selection.name);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    if (engagementType !== 'direct' && !sourceName.trim()) {
      toast.error('Please select the platform or agency');
      return;
    }
    const isDirect = engagementType === 'direct';
    if (isDirect && billingCadence === 'biweekly' && !anchorDate) {
      toast.error('Pick the first pay period start date for biweekly billing.');
      return;
    }
    const effectiveTaxForm: TaxFormType | null =
      engagementType === 'third_party' ? taxFormType : null;
    await onSave({
      name: name.trim(),
      billing_name_to: isDirect ? (billingNameTo.trim() || undefined) : undefined,
      billing_email: isDirect ? (billingEmail.trim() || undefined) : undefined,
      address: address.trim() || undefined,
      weekday_rate: weekdayRate ? parseFloat(weekdayRate) : undefined,
      weekday_rate_kind: weekdayRate ? weekdayRateKind : undefined,
      billing_cadence: isDirect ? billingCadence : undefined,
      billing_week_end_day: undefined,
      billing_anchor_date: isDirect && billingCadence === 'biweekly' ? (anchorDate ?? undefined) : undefined,
      auto_generate_invoices: isDirect,
      engagement_type: engagementType,
      source_name: isDirect ? null : sourceName.trim() || null,
      tax_form_type: effectiveTaxForm,
    });
  };

  const biweeklyMissingAnchor = engagementType === 'direct' && billingCadence === 'biweekly' && !anchorDate;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-foreground font-[Manrope]">Add your first practice</h2>
        <p className="text-muted-foreground mt-1">
          Start with one place you work so we can organize your schedule and billing.
        </p>
      </div>

      <div className="space-y-4">
        {!manualEntry && !clinicSelected && (
          <div>
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
              className="text-xs text-primary hover:underline mt-1"
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
                className="text-xs text-primary hover:underline"
              >
                ← Search again
              </button>
            )}
            <div>
              <Label>Practice / facility name <span className="text-destructive">*</span></Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Valley Animal Hospital"
                autoFocus={manualEntry}
              />
            </div>
            <div>
              <Label>Address</Label>
              <GooglePlacesAutocomplete
                value={address}
                onChange={setAddress}
                placeholder="123 Main St, City, ST"
              />
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

        {engagementType === 'direct' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Billing contact name</Label>
              <Input
                value={billingNameTo}
                onChange={e => setBillingNameTo(e.target.value)}
                placeholder="e.g. Billing Dept"
              />
            </div>
            <div>
              <Label>Billing email</Label>
              <Input
                type="email"
                value={billingEmail}
                onChange={e => setBillingEmail(e.target.value)}
                placeholder="billing@clinic.com"
              />
            </div>
          </div>
        )}

        {engagementType === 'direct' && (
          <div>
            <Label>Default rate</Label>
            <div className="flex items-center gap-2 mt-1">
              <div className="inline-flex rounded-md border border-border overflow-hidden h-10" role="group">
                {(['flat', 'hourly'] as RateKind[]).map(k => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setWeekdayRateKind(k)}
                    className={cn(
                      'px-3 text-xs font-medium transition-colors',
                      weekdayRateKind === k
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {k === 'flat' ? 'Flat' : 'Hourly'}
                  </button>
                ))}
              </div>
              <div className="relative flex-1">
                <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="number"
                  value={weekdayRate}
                  onChange={e => setWeekdayRate(e.target.value)}
                  placeholder={weekdayRateKind === 'hourly' ? 'e.g. 95' : 'e.g. 800'}
                  className="pl-7 pr-10"
                  min={0}
                  step={weekdayRateKind === 'hourly' ? 5 : 50}
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">
                  {weekdayRateKind === 'hourly' ? '/hr' : '/day'}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Most relief shifts are flat day rates — switch to hourly if you bill by the hour. You can add more rate types later in facility settings.
            </p>
          </div>
        )}

        {engagementType === 'direct' && (
          <div className="border-t border-border pt-4 space-y-3">
            <p className="text-sm font-medium text-foreground">Invoicing preferences</p>
            <div>
              <Label>Billing cadence</Label>
              <Select value={billingCadence} onValueChange={(v: BillingCadence) => setBillingCadence(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly (Mon–Sun)</SelectItem>
                  <SelectItem value="biweekly">Biweekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
              {billingCadence === 'weekly' && (
                <p className="text-xs text-muted-foreground mt-1">Billing week runs Monday through Sunday. Draft generates on the morning of your last scheduled shift that week.</p>
              )}
              {billingCadence === 'monthly' && (
                <p className="text-xs text-muted-foreground mt-1">Draft generates on the morning of your last scheduled shift of the month.</p>
              )}
              {billingCadence === 'daily' && (
                <p className="text-xs text-muted-foreground mt-1">A draft invoice is generated each morning you have a scheduled shift.</p>
              )}
              {billingCadence === 'biweekly' && (
                <p className="text-xs text-muted-foreground mt-1">One invoice every two weeks, aligned to the clinic's payroll cycle. Draft generates on the morning of your last scheduled shift in each 14-day period.</p>
              )}
            </div>
            {billingCadence === 'biweekly' && (
              <div>
                <Label>First pay period starts on <span className="text-destructive">*</span></Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal mt-1',
                        !anchorDate && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {anchorDate ? format(parseDateOnly(anchorDate)!, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={parseDateOnly(anchorDate)}
                      onSelect={(d) => setAnchorDate(d ? formatDateOnly(d) : null)}
                      initialFocus
                      className={cn('p-3 pointer-events-auto')}
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground mt-1">Pick the start date of any one of this clinic's pay periods — invoices repeat every 14 days from this date.</p>
                {anchorDate && (() => {
                  const windows = computeBiweeklyWindows(anchorDate);
                  if (!windows.length) return null;
                  return (
                    <div className="mt-2 rounded-md bg-primary/5 border border-primary/10 px-3 py-2 space-y-1">
                      <p className="text-xs font-medium text-primary">Upcoming pay periods</p>
                      {windows.map((w, i) => (
                        <p key={i} className="text-xs text-foreground font-medium">{w.start} – {w.end}</p>
                      ))}
                    </div>
                  );
                })()}
                {biweeklyMissingAnchor && (
                  <p className="text-xs text-destructive mt-1">Required for biweekly billing.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <Button onClick={handleSubmit} disabled={!name.trim() || saving || biweeklyMissingAnchor} className="w-full" size="lg">
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Save and continue <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
