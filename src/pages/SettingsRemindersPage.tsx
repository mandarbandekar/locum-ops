import { useState } from 'react';
import { SettingsNav } from '@/components/SettingsNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useReminderPreferences, ACTIVE_CATEGORIES, type ActiveReminderCategory } from '@/hooks/useReminderPreferences';

const CATEGORY_LABELS: Record<ActiveReminderCategory, string> = {
  invoices: 'Invoices',
  credentials: 'Credentials / CE',
};

const CATEGORY_DESCRIPTIONS: Record<ActiveReminderCategory, string> = {
  invoices: 'Invoice ready for review and overdue payment alerts',
  credentials: 'License expiration warnings (60 days out) and CE deadline alerts',
};

const TIMING_OPTIONS = [
  { key: 'same_day', label: 'Same day' },
  { key: '1_day_before', label: '1 day before' },
  { key: '3_days_before', label: '3 days before' },
  { key: '7_days_before', label: '7 days before' },
  { key: 'weekly_digest', label: 'Weekly digest' },
];

export default function SettingsRemindersPage() {
  const { prefs, categories, loading, updatePrefs, updateCategory } = useReminderPreferences();
  const { user, isDemo } = useAuth();
  const [sendingReminders, setSendingReminders] = useState(false);

  const handleSendRemindersNow = async () => {
    if (isDemo) { toast.info('Email sending is disabled in demo mode'); return; }
    setSendingReminders(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('You must be logged in'); return; }
      const { data, error } = await supabase.functions.invoke('send-reminder-emails', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      const enqueued = data?.enqueued || 0;
      toast[enqueued > 0 ? 'success' : 'info'](
        enqueued > 0
          ? `${enqueued} reminder email${enqueued > 1 ? 's' : ''} queued for delivery`
          : 'No reminders to send right now — all caught up!'
      );
    } catch (err: any) {
      console.error('Failed to send reminders:', err);
      toast.error('Failed to send reminders');
    } finally {
      setSendingReminders(false);
    }
  };

  if (loading || !prefs) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const handleToggleChannel = async (field: 'email_enabled' | 'sms_enabled' | 'in_app_enabled') => {
    await updatePrefs({ [field]: !prefs[field] });
    toast.success('Preference updated');
  };

  const handleFieldUpdate = async (field: string, value: string | null) => {
    await updatePrefs({ [field]: value } as any);
    toast.success('Saved');
  };

  const handleCategoryToggle = async (category: string, field: string, value: boolean) => {
    await updateCategory(category, { [field]: value } as any);
  };

  const handleTimingToggle = async (category: string, timingKey: string) => {
    const cat = categories.find(c => c.category === category);
    if (!cat) return;
    const current = cat.timing_config || {};
    await updateCategory(category, { timing_config: { ...current, [timingKey]: !current[timingKey] } });
  };

  return (
    <div>
      <SettingsNav />
      <div className="page-header">
        <h1 className="page-title">Reminders</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Choose which workflow reminders you receive and when.
      </p>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" /> Send Reminders Now
            </CardTitle>
            <CardDescription>Manually trigger invoice and credential reminder emails based on your current data</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleSendRemindersNow} disabled={sendingReminders || isDemo} className="gap-2">
              {sendingReminders ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {sendingReminders ? 'Sending…' : 'Send reminders now'}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">Won't send duplicates for the same day.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" /> Delivery Channels
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {([
              ['email_enabled', 'Email reminders', Mail],
              ['sms_enabled', 'SMS reminders', Smartphone],
              ['in_app_enabled', 'In-app reminders', MessageSquare],
            ] as const).map(([field, label, Icon]) => (
              <div key={field}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{label}</span>
                  </div>
                  <Switch checked={prefs[field]} onCheckedChange={() => handleToggleChannel(field)} />
                </div>
                {field === 'sms_enabled' && prefs.sms_enabled && !prefs.phone_number && (
                  <p className="text-xs text-destructive mt-1.5 ml-6">
                    ⚠ Enter your phone number below to receive SMS alerts.
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Contact Info</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Reminder email</Label>
              <Input type="email" placeholder="you@example.com" defaultValue={prefs.reminder_email || ''} onBlur={e => handleFieldUpdate('reminder_email', e.target.value || null)} />
            </div>
            <div>
              <Label>Mobile phone number</Label>
              <Input type="tel" placeholder="+1 (555) 000-0000" defaultValue={prefs.phone_number || ''} onBlur={e => handleFieldUpdate('phone_number', e.target.value || null)} />
              <p className="text-xs text-muted-foreground mt-1">Used in: SMS reminders only.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Categories</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {CATEGORIES.map(cat => {
                const setting = categories.find(c => c.category === cat);
                if (!setting) return null;
                return (
                  <div key={cat} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{CATEGORY_LABELS[cat]}</span>
                      {CATEGORY_DESCRIPTIONS[cat] && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{CATEGORY_DESCRIPTIONS[cat]}</p>
                      )}
                      <Switch checked={setting.enabled} onCheckedChange={val => handleCategoryToggle(cat, 'enabled', val)} />
                    </div>
                    {setting.enabled && (
                      <div className="pl-4 border-l-2 border-border space-y-2">
                        <div className="flex gap-4">
                          {(['email_enabled', 'sms_enabled', 'in_app_enabled'] as const).map(f => (
                            <label key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                              <Checkbox checked={setting[f]} onCheckedChange={val => handleCategoryToggle(cat, f, !!val)} />
                              {f === 'email_enabled' ? 'Email' : f === 'sms_enabled' ? 'SMS' : 'In-app'}
                            </label>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {TIMING_OPTIONS.map(opt => (
                            <label key={opt.key} className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
                              <Checkbox checked={!!(setting.timing_config || {})[opt.key]} onCheckedChange={() => handleTimingToggle(cat, opt.key)} />
                              {opt.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Quiet Hours
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start</Label>
              <Input type="time" defaultValue={prefs.quiet_hours_start || '22:00'} onBlur={e => handleFieldUpdate('quiet_hours_start', e.target.value || null)} />
            </div>
            <div>
              <Label>End</Label>
              <Input type="time" defaultValue={prefs.quiet_hours_end || '07:00'} onBlur={e => handleFieldUpdate('quiet_hours_end', e.target.value || null)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Digest Summary</CardTitle></CardHeader>
          <CardContent>
            <Select value={prefs.digest_frequency} onValueChange={val => handleFieldUpdate('digest_frequency', val)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Off</SelectItem>
                <SelectItem value="daily">Daily summary</SelectItem>
                <SelectItem value="weekly">Weekly summary</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
