import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowRight, DollarSign, Loader2, AlertTriangle } from 'lucide-react';
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
  const [billingWeekEndDay, setBillingWeekEndDay] = useState('saturday');
  const [billingAnchorDate, setBillingAnchorDate] = useState('');
  const [autoGenerateInvoices, setAutoGenerateInvoices] = useState(true);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    await onSave({
      name: name.trim(),
      billing_name_to: billingNameTo.trim() || undefined,
      billing_email: billingEmail.trim() || undefined,
      address: address.trim() || undefined,
      weekday_rate: weekdayRate ? parseFloat(weekdayRate) : undefined,
      billing_cadence: billingCadence,
      billing_week_end_day: billingCadence === 'weekly' ? billingWeekEndDay : undefined,
      billing_anchor_date: billingCadence === 'biweekly' && billingAnchorDate ? billingAnchorDate : undefined,
      auto_generate_invoices: autoGenerateInvoices && !!billingEmail.trim(),
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

        {/* Invoicing Preferences */}
        <div className="border-t border-border pt-4 space-y-3">
          <p className="text-sm font-medium text-foreground">Invoicing preferences</p>
          <div>
            <Label>Billing cadence</Label>
            <Select value={billingCadence} onValueChange={(v: BillingCadence) => setBillingCadence(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Biweekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {billingCadence === 'weekly' && (
            <div>
              <Label>Week ends on</Label>
              <Select value={billingWeekEndDay} onValueChange={setBillingWeekEndDay}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['sunday','monday','tuesday','wednesday','thursday','friday','saturday'].map(d => (
                    <SelectItem key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Weekly invoices default to Saturday billing close.</p>
            </div>
          )}

          {billingCadence === 'biweekly' && (
            <div>
              <Label>Cycle start date</Label>
              <Input type="date" value={billingAnchorDate} onChange={e => setBillingAnchorDate(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Anchor date for the biweekly billing cycle.</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-generate invoices</Label>
              <p className="text-xs text-muted-foreground">Drafts are created automatically and reviewed before sending.</p>
            </div>
            <Switch checked={autoGenerateInvoices} onCheckedChange={setAutoGenerateInvoices} />
          </div>

          {autoGenerateInvoices && !billingEmail.trim() && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400">Add a billing email above to enable invoice generation and sending.</p>
            </div>
          )}
        </div>
      </div>

      <Button onClick={handleSubmit} disabled={!name.trim() || saving} className="w-full" size="lg">
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Save and continue <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
