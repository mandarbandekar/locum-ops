import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, DollarSign, Loader2 } from 'lucide-react';
import type { ManualFacilityInput } from '@/hooks/useManualSetup';

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

  const handleSubmit = async () => {
    if (!name.trim()) return;
    await onSave({
      name: name.trim(),
      billing_name_to: billingNameTo.trim() || undefined,
      billing_email: billingEmail.trim() || undefined,
      address: address.trim() || undefined,
      weekday_rate: weekdayRate ? parseFloat(weekdayRate) : undefined,
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
        <div>
          <Label>Practice / facility name <span className="text-destructive">*</span></Label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Valley Animal Hospital"
            autoFocus
          />
        </div>

        <div>
          <Label>Address</Label>
          <Input
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="123 Main St, City, ST"
          />
        </div>

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
      </div>

      <Button onClick={handleSubmit} disabled={!name.trim() || saving} className="w-full" size="lg">
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Save and continue <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
