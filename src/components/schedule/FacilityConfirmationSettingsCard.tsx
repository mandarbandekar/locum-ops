import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Save, Edit2, AlertTriangle, Mail, CalendarDays, Clock } from 'lucide-react';
import { FacilityConfirmationSettings, MONTHLY_OFFSET_OPTIONS, PRESHIFT_OFFSET_OPTIONS } from '@/types/clinicConfirmations';
import { toast } from 'sonner';

interface Props {
  facilityId: string;
  settings: FacilityConfirmationSettings | null;
  onSave: (s: FacilityConfirmationSettings) => void;
  initialEditing?: boolean;
  /** When true, renders without Card wrapper/header — caller handles chrome */
  embedded?: boolean;
  /** Expose save handler to parent */
  onSaveRef?: React.MutableRefObject<(() => void) | null>;
}

export function FacilityConfirmationSettingsCard({ facilityId, settings, onSave, initialEditing, embedded, onSaveRef }: Props) {
  const [editing, setEditing] = useState(initialEditing ?? false);
  const [form, setForm] = useState<FacilityConfirmationSettings>({
    id: settings?.id || '',
    facility_id: facilityId,
    primary_contact_name: settings?.primary_contact_name || '',
    primary_contact_email: settings?.primary_contact_email || '',
    secondary_contact_email: settings?.secondary_contact_email || '',
    monthly_enabled: settings?.monthly_enabled ?? true,
    monthly_send_offset_days: settings?.monthly_send_offset_days ?? 7,
    preshift_enabled: settings?.preshift_enabled ?? false,
    preshift_send_offset_days: settings?.preshift_send_offset_days ?? 3,
    auto_send_enabled: settings?.auto_send_enabled ?? false,
    auto_send_monthly: settings?.auto_send_monthly ?? false,
    auto_send_preshift: settings?.auto_send_preshift ?? false,
  });

  useEffect(() => {
    if (settings) {
      setForm({ ...settings, facility_id: facilityId });
    }
  }, [settings, facilityId]);

  const handleSave = () => {
    if (!form.primary_contact_email && (form.auto_send_monthly || form.auto_send_preshift)) {
      toast.error('Add a contact email to enable auto-send');
      return;
    }
    // Sync legacy auto_send_enabled from per-mode flags
    const updated = { ...form, auto_send_enabled: form.auto_send_monthly || form.auto_send_preshift };
    onSave(updated);
    setEditing(false);
  };

  const noContact = !form.primary_contact_email;

  const confirmationMode = form.monthly_enabled && form.preshift_enabled
    ? 'Both'
    : form.monthly_enabled
    ? 'Monthly'
    : form.preshift_enabled
    ? 'Pre-shift'
    : 'Manual only';

  if (!editing) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Scheduling / Confirmation Settings</CardTitle>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            <Edit2 className="mr-1 h-3 w-3" /> Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {noContact && !settings && (
            <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-sm text-orange-700 dark:text-orange-300 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Add a scheduling contact to enable automatic confirmations.</span>
            </div>
          )}

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Contact</span>
              <span className="font-medium">{form.primary_contact_name || '—'} {form.primary_contact_email ? `· ${form.primary_contact_email}` : ''}</span>
            </div>
            {form.secondary_contact_email && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">CC</span>
                <span className="font-medium">{form.secondary_contact_email}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mode</span>
              <span className="font-medium">{confirmationMode}</span>
            </div>
            {form.monthly_enabled && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monthly offset</span>
                  <span className="font-medium">{form.monthly_send_offset_days} days before</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Auto-send monthly</span>
                  <Badge variant="outline" className={`text-xs ${form.auto_send_monthly ? 'border-green-500/30 text-green-600 bg-green-500/10' : 'border-muted-foreground/30 text-muted-foreground bg-muted/50'}`}>
                    {form.auto_send_monthly ? 'Auto-send' : 'Manual review'}
                  </Badge>
                </div>
              </>
            )}
            {form.preshift_enabled && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pre-shift offset</span>
                  <span className="font-medium">{form.preshift_send_offset_days === 0 ? 'Same day' : `${form.preshift_send_offset_days} day${form.preshift_send_offset_days > 1 ? 's' : ''} before`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Auto-send pre-shift</span>
                  <Badge variant="outline" className={`text-xs ${form.auto_send_preshift ? 'border-green-500/30 text-green-600 bg-green-500/10' : 'border-muted-foreground/30 text-muted-foreground bg-muted/50'}`}>
                    {form.auto_send_preshift ? 'Auto-send' : 'Manual review'}
                  </Badge>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Scheduling / Confirmation Settings</CardTitle>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave}><Save className="mr-1 h-3 w-3" /> Save</Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contact info */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Scheduling Contact</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Contact Name</Label>
              <Input value={form.primary_contact_name} onChange={e => setForm(p => ({ ...p, primary_contact_name: e.target.value }))} placeholder="Practice Manager" />
            </div>
            <div>
              <Label className="text-xs">Contact Email</Label>
              <Input type="email" value={form.primary_contact_email} onChange={e => setForm(p => ({ ...p, primary_contact_email: e.target.value }))} placeholder="manager@clinic.com" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Secondary Email (optional)</Label>
            <Input type="email" value={form.secondary_contact_email} onChange={e => setForm(p => ({ ...p, secondary_contact_email: e.target.value }))} placeholder="cc@clinic.com" />
          </div>
        </div>

        {/* Confirmation modes */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Confirmation Modes</p>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Monthly Confirmation</p>
                <p className="text-xs text-muted-foreground">One email per month with all booked shifts</p>
              </div>
            </div>
            <Switch checked={form.monthly_enabled} onCheckedChange={v => setForm(p => ({ ...p, monthly_enabled: v, ...(!v ? { auto_send_monthly: false } : {}) }))} />
          </div>

          {form.monthly_enabled && (
            <div className="ml-6 space-y-3">
              <div>
                <Label className="text-xs">Send offset</Label>
                <Select value={String(form.monthly_send_offset_days)} onValueChange={v => setForm(p => ({ ...p, monthly_send_offset_days: Number(v) }))}>
                  <SelectTrigger className="h-8 text-xs w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHLY_OFFSET_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Auto-send monthly confirmations</p>
                  <p className="text-xs text-muted-foreground">If off, reminders will be prepared for manual review instead.</p>
                </div>
                <Switch
                  checked={form.auto_send_monthly}
                  onCheckedChange={v => {
                    if (v && !form.primary_contact_email) {
                      toast.error('Add a contact email first');
                      return;
                    }
                    setForm(p => ({ ...p, auto_send_monthly: v }));
                  }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Pre-shift Reminder</p>
                <p className="text-xs text-muted-foreground">Short reminder before each booked shift</p>
              </div>
            </div>
            <Switch checked={form.preshift_enabled} onCheckedChange={v => setForm(p => ({ ...p, preshift_enabled: v, ...(!v ? { auto_send_preshift: false } : {}) }))} />
          </div>

          {form.preshift_enabled && (
            <div className="ml-6 space-y-3">
              <div>
                <Label className="text-xs">Reminder offset</Label>
                <Select value={String(form.preshift_send_offset_days)} onValueChange={v => setForm(p => ({ ...p, preshift_send_offset_days: Number(v) }))}>
                  <SelectTrigger className="h-8 text-xs w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESHIFT_OFFSET_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Auto-send pre-shift reminders</p>
                  <p className="text-xs text-muted-foreground">If off, reminders will be prepared for manual review instead.</p>
                </div>
                <Switch
                  checked={form.auto_send_preshift}
                  onCheckedChange={v => {
                    if (v && !form.primary_contact_email) {
                      toast.error('Add a contact email first');
                      return;
                    }
                    setForm(p => ({ ...p, auto_send_preshift: v }));
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {!form.primary_contact_email && (
          <p className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Add a scheduling contact to enable auto-send.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
