import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowRight, DollarSign, Loader2, AlertTriangle } from 'lucide-react';
import { GooglePlacesAutocomplete } from '@/components/GooglePlacesAutocomplete';
import type { PlaceSelection } from '@/components/GooglePlacesAutocomplete';
import type { ManualFacilityInput } from '@/hooks/useManualSetup';
import type { BillingCadence } from '@/lib/invoiceBillingDefaults';

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
  const [billingCadence, setBillingCadence] = useState<BillingCadence>('monthly');
  
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
    await onSave({
      name: name.trim(),
      billing_name_to: billingNameTo.trim() || undefined,
      billing_email: billingEmail.trim() || undefined,
      address: address.trim() || undefined,
      weekday_rate: weekdayRate ? parseFloat(weekdayRate) : undefined,
      billing_cadence: billingCadence,
      billing_week_end_day: undefined,
      billing_anchor_date: undefined,
      auto_generate_invoices: true,
    });
  };

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

        <div>
          <Label>Default day rate</Label>
          <div className="relative">
            <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="number"
              value={weekdayRate}
              onChange={e => setWeekdayRate(e.target.value)}
              placeholder="e.g. 800"
              className="pl-7"
              min={0}
              step={50}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">You can add more rate types later in facility settings.</p>
        </div>

        {/* Invoicing Preferences */}
        <div className="border-t border-border pt-4 space-y-3">
          <p className="text-sm font-medium text-foreground">Invoicing preferences</p>
          <div>
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
              <p className="text-xs text-muted-foreground mt-1">Billing week runs Monday through Sunday. Draft generates on the morning of your last scheduled shift that week.</p>
            )}
            {billingCadence === 'monthly' && (
              <p className="text-xs text-muted-foreground mt-1">Draft generates on the morning of your last scheduled shift of the month.</p>
            )}
            {billingCadence === 'daily' && (
              <p className="text-xs text-muted-foreground mt-1">A draft invoice is generated each morning you have a scheduled shift.</p>
            )}
          </div>

        </div>
      </div>

      <Button onClick={handleSubmit} disabled={!name.trim() || saving} className="w-full" size="lg">
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Save and continue <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
