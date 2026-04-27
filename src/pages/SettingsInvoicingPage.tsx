import { useState } from 'react';
import { SettingsNav } from '@/components/SettingsNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserProfile, type EmailTone, type TermsFieldsEnabled } from '@/contexts/UserProfileContext';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

const TONES: { value: EmailTone; label: string }[] = [
  { value: 'friendly', label: 'Friendly' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'direct', label: 'Direct' },
];

export default function SettingsInvoicingPage() {
  const { profile, updateProfile } = useUserProfile();

  const [invoicePrefix, setInvoicePrefix] = useState(profile?.invoice_prefix || 'INV');
  const [dueDays, setDueDays] = useState(profile?.invoice_due_default_days || 14);
  const [defaultNote, setDefaultNote] = useState('');
  const [autoCreateDraft, setAutoCreateDraft] = useState(true);
  const [emailTone, setEmailTone] = useState<EmailTone>(profile?.email_tone || 'neutral');
  const [termsFields, setTermsFields] = useState<TermsFieldsEnabled>(
    profile?.terms_fields_enabled || { weekday_rate: true, weekend_rate: true, cancellation_policy: true, overtime_policy: true, late_payment_policy: true, special_notes: true }
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await updateProfile({
      invoice_prefix: invoicePrefix.trim(),
      invoice_due_default_days: dueDays,
      email_tone: emailTone,
      terms_fields_enabled: termsFields,
    });
    setSaving(false);
    toast.success('Invoicing settings saved');
  };

  return (
    <div>
      <SettingsNav />
      <div className="page-header">
        <h1 className="page-title">Invoicing</h1>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="mr-1 h-4 w-4" /> {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Defaults for invoice creation and draft behavior. Drafts are saved — never sent until you explicitly send.
      </p>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader><CardTitle className="text-base">Invoice Defaults</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Invoice prefix</Label>
                <Input value={invoicePrefix} onChange={e => setInvoicePrefix(e.target.value)} placeholder="INV" />
                <p className="text-xs text-muted-foreground mt-1">Used in: New invoice numbers.</p>
              </div>
              <div>
                <Label>Default due date</Label>
                <Select value={String(dueDays)} onValueChange={v => setDueDays(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Net 7</SelectItem>
                    <SelectItem value="14">Net 14</SelectItem>
                    <SelectItem value="30">Net 30</SelectItem>
                    <SelectItem value="45">Net 45</SelectItem>
                    <SelectItem value="60">Net 60</SelectItem>
                    <SelectItem value="0">Due upon receipt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Default invoice note <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea
                value={defaultNote}
                onChange={e => setDefaultNote(e.target.value)}
                placeholder="Thank you for your business!"
                rows={2}
              />
              <p className="text-xs text-muted-foreground mt-1">Auto-filled on new invoices. You can edit per invoice.</p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Auto-create draft when shift completed</span>
                <p className="text-xs text-muted-foreground mt-0.5">Draft saved — not sent until you explicitly send it.</p>
              </div>
              <Switch checked={autoCreateDraft} onCheckedChange={setAutoCreateDraft} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Email Tone</CardTitle></CardHeader>
          <CardContent>
            <RadioGroup value={emailTone} onValueChange={v => setEmailTone(v as EmailTone)} className="flex gap-4">
              {TONES.map(t => (
                <div key={t.value} className="flex items-center gap-1.5">
                  <RadioGroupItem value={t.value} id={`tone-${t.value}`} />
                  <Label htmlFor={`tone-${t.value}`}>{t.label}</Label>
                </div>
              ))}
            </RadioGroup>
            <p className="text-xs text-muted-foreground mt-2">Sets the default tone for invoice reminder emails.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Terms Fields</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">Choose which contract terms fields appear when setting up facility terms.</p>
            <div className="space-y-2">
              {([
                ['weekday_rate', 'Weekday rate'],
                ['weekend_rate', 'Weekend rate'],
                ['cancellation_policy', 'Cancellation policy'],
                ['overtime_policy', 'Overtime policy'],
                ['late_payment_policy', 'Late payment policy'],
                ['special_notes', 'Special notes'],
              ] as [keyof TermsFieldsEnabled, string][]).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm">{label}</span>
                  <Switch checked={termsFields[key]} onCheckedChange={() => setTermsFields(prev => ({ ...prev, [key]: !prev[key] }))} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
