import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useUserProfile, type Profession, type EmailTone, type CurrentTool, type FacilitiesCountBand, type InvoicesPerMonthBand, type TermsFieldsEnabled } from '@/contexts/UserProfileContext';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

const PROFESSIONS: { value: Profession; label: string }[] = [
  { value: 'vet', label: 'Veterinarian' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'physician', label: 'Physician' },
  { value: 'pharmacist', label: 'Pharmacist' },
  { value: 'pt_ot', label: 'PT / OT' },
  { value: 'other', label: 'Other' },
];

const WORK_STYLES = ['Independent contractor (1099)', 'S-Corp', 'W-2 per diem', 'Mix'];

const TOOL_OPTIONS: { value: CurrentTool; label: string }[] = [
  { value: 'sheets_excel', label: 'Google Sheets / Excel' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'quickbooks', label: 'QuickBooks' },
  { value: 'wave', label: 'Wave' },
  { value: 'freshbooks', label: 'FreshBooks' },
  { value: 'notes', label: 'Notes' },
  { value: 'other', label: 'Other' },
];

const TONES: { value: EmailTone; label: string }[] = [
  { value: 'friendly', label: 'Friendly' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'direct', label: 'Direct' },
];

export default function SettingsProfilePage() {
  const { profile, updateProfile } = useUserProfile();

  const [profession, setProfession] = useState<Profession>(profile?.profession || 'other');
  const [workStyle, setWorkStyle] = useState(profile?.work_style_label || '');
  const [timezone, setTimezone] = useState(profile?.timezone || '');
  const [currency, setCurrency] = useState(profile?.currency || 'USD');
  const [currentTools, setCurrentTools] = useState<CurrentTool[]>(profile?.current_tools || []);
  const [facilitiesBand, setFacilitiesBand] = useState<FacilitiesCountBand>(profile?.facilities_count_band || 'band_1_3');
  const [invoicesBand, setInvoicesBand] = useState<InvoicesPerMonthBand>(profile?.invoices_per_month_band || 'inv_1_3');
  const [dueDays, setDueDays] = useState(profile?.invoice_due_default_days || 14);
  
  const [emailTone, setEmailTone] = useState<EmailTone>(profile?.email_tone || 'neutral');
  const [termsFields, setTermsFields] = useState<TermsFieldsEnabled>(
    profile?.terms_fields_enabled || { weekday_rate: true, weekend_rate: true, cancellation_policy: true, overtime_policy: true, late_payment_policy: true, special_notes: true }
  );
  const [saving, setSaving] = useState(false);

  const toggleTool = (tool: CurrentTool) => {
    setCurrentTools(prev => prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool]);
  };

  const handleSave = async () => {
    setSaving(true);
    await updateProfile({
      profession, work_style_label: workStyle, timezone, currency, current_tools: currentTools,
      facilities_count_band: facilitiesBand, invoices_per_month_band: invoicesBand,
      invoice_due_default_days: dueDays, invoice_prefix: invoicePrefix, email_tone: emailTone,
      terms_fields_enabled: termsFields,
    });
    setSaving(false);
    toast.success('Profile saved');
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Profile Settings</h1>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="mr-1 h-4 w-4" /> {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">You can change these anytime.</p>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader><CardTitle className="text-base">About You</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Profession</Label>
                <Select value={profession} onValueChange={v => setProfession(v as Profession)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PROFESSIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Work style</Label>
                <Select value={workStyle} onValueChange={setWorkStyle}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{WORK_STYLES.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Timezone</Label><Input value={timezone} onChange={e => setTimezone(e.target.value)} /></div>
              <div>
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem><SelectItem value="CAD">CAD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="AUD">AUD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Operations</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-2 block">Current tools</Label>
              <div className="flex flex-wrap gap-3">
                {TOOL_OPTIONS.map(t => (
                  <label key={t.value} className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox checked={currentTools.includes(t.value)} onCheckedChange={() => toggleTool(t.value)} />
                    <span className="text-sm">{t.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Facilities count</Label>
                <Select value={facilitiesBand} onValueChange={v => setFacilitiesBand(v as FacilitiesCountBand)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="band_1_3">1–3</SelectItem>
                    <SelectItem value="band_4_8">4–8</SelectItem>
                    <SelectItem value="band_9_plus">9+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Invoices / month</Label>
                <Select value={invoicesBand} onValueChange={v => setInvoicesBand(v as InvoicesPerMonthBand)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inv_1_3">1–3</SelectItem>
                    <SelectItem value="inv_4_10">4–10</SelectItem>
                    <SelectItem value="inv_11_plus">11+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Defaults</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Invoice due (days)</Label>
                <Input type="number" value={dueDays} onChange={e => setDueDays(Number(e.target.value))} min={1} />
              </div>
            </div>
            <div>
              <Label>Email tone</Label>
              <RadioGroup value={emailTone} onValueChange={v => setEmailTone(v as EmailTone)} className="flex gap-4 mt-1">
                {TONES.map(t => (
                  <div key={t.value} className="flex items-center gap-1.5">
                    <RadioGroupItem value={t.value} id={`s-tone-${t.value}`} />
                    <Label htmlFor={`s-tone-${t.value}`}>{t.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div>
              <Label className="mb-2 block">Terms fields</Label>
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
