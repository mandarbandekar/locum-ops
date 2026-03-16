import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRight, Loader2 } from 'lucide-react';
import { RatesEditor, RateEntry, ratesToTermsFields } from '@/components/facilities/RatesEditor';
import type { ManualFacilityInput } from '@/hooks/useManualSetup';

interface Props {
  onSave: (input: ManualFacilityInput) => Promise<any>;
  saving: boolean;
}

export function ManualFacilityForm({ onSave, saving }: Props) {
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [billingNameTo, setBillingNameTo] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [billingNameCc, setBillingNameCc] = useState('');
  const [billingEmailCc, setBillingEmailCc] = useState('');
  const [billingNameBcc, setBillingNameBcc] = useState('');
  const [billingEmailBcc, setBillingEmailBcc] = useState('');
  const [address, setAddress] = useState('');
  const [rates, setRates] = useState<RateEntry[]>([]);
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) return;
    const rateFields = ratesToTermsFields(rates);
    await onSave({
      name: name.trim(),
      contact_name: contactName.trim() || undefined,
      billing_name_to: billingNameTo.trim() || undefined,
      billing_email: billingEmail.trim() || undefined,
      billing_name_cc: billingNameCc.trim() || undefined,
      billing_email_cc: billingEmailCc.trim() || undefined,
      billing_name_bcc: billingNameBcc.trim() || undefined,
      billing_email_bcc: billingEmailBcc.trim() || undefined,
      address: address.trim() || undefined,
      weekday_rate: rateFields.weekday_rate || undefined,
      weekend_rate: rateFields.weekend_rate || undefined,
      partial_day_rate: rateFields.partial_day_rate || undefined,
      holiday_rate: rateFields.holiday_rate || undefined,
      telemedicine_rate: rateFields.telemedicine_rate || undefined,
      custom_rates: rateFields.custom_rates.length > 0 ? rateFields.custom_rates : undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add your first practice</CardTitle>
        <CardDescription>
          Start with one place you already work so LocumOps can begin organizing your schedule and billing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
          <Label>Contact person</Label>
          <Input
            value={contactName}
            onChange={e => setContactName(e.target.value)}
            placeholder="e.g. Dr. Smith"
          />
        </div>
        <div>
          <Label>Invoice email (To)</Label>
          <Input
            type="email"
            value={billingEmail}
            onChange={e => setBillingEmail(e.target.value)}
            placeholder="billing@clinic.com"
          />
          <p className="text-xs text-muted-foreground mt-1">Where invoices will be sent for this practice.</p>
        </div>
        <div>
          <Label>Invoice email (CC)</Label>
          <Input
            type="email"
            value={billingEmailCc}
            onChange={e => setBillingEmailCc(e.target.value)}
            placeholder="manager@clinic.com"
          />
        </div>
        <div>
          <Label>Invoice email (BCC)</Label>
          <Input
            type="email"
            value={billingEmailBcc}
            onChange={e => setBillingEmailBcc(e.target.value)}
            placeholder="records@clinic.com"
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
        <div>
          <Label className="mb-2 block">Shift Rates</Label>
          <RatesEditor rates={rates} onChange={setRates} showCard={false} compact />
        </div>
        <div>
          <Label>Notes</Label>
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Anything else to remember about this practice..."
            rows={2}
          />
        </div>
        <Button onClick={handleSubmit} disabled={!name.trim() || saving} className="w-full">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save and add shifts <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
