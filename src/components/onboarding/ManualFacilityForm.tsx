import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRight, Loader2 } from 'lucide-react';
import type { ManualFacilityInput } from '@/hooks/useManualSetup';

interface Props {
  onSave: (input: ManualFacilityInput) => Promise<any>;
  saving: boolean;
}

export function ManualFacilityForm({ onSave, saving }: Props) {
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [address, setAddress] = useState('');
  const [weekdayRate, setWeekdayRate] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) return;
    await onSave({
      name: name.trim(),
      contact_name: contactName.trim() || undefined,
      billing_email: billingEmail.trim() || undefined,
      address: address.trim() || undefined,
      weekday_rate: weekdayRate ? parseFloat(weekdayRate) : undefined,
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
          <Label>Address</Label>
          <Input
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="123 Main St, City, ST"
          />
        </div>
        <div>
          <Label>Weekday rate</Label>
          <Input
            type="number"
            value={weekdayRate}
            onChange={e => setWeekdayRate(e.target.value)}
            placeholder="e.g. 800"
            min={0}
            step={50}
          />
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
