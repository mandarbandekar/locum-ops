import { useState } from 'react';
import { SettingsNav } from '@/components/SettingsNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useReminderPreferences, CATEGORIES, type ReminderCategory } from '@/hooks/useReminderPreferences';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, Bell, Mail, MessageSquare, Smartphone, Clock, Send, Loader2 } from 'lucide-react';

const CATEGORY_LABELS: Record<ReminderCategory, string> = {
  invoices: 'Invoices',
  confirmations: 'Confirmations',
  shifts: 'Shifts',
  credentials: 'Credentials / CE',
  contracts: 'Contracts',
  outreach: 'Outreach',
  taxes: 'Taxes',
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
  const [saving, setSaving] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);

  const handleSendRemindersNow = async () => {
    if (isDemo) {
      toast.info('Email sending is disabled in demo mode');
      return;
    }
    setSendingReminders(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in');
        return;
      }
      const { data, error } = await supabase.functions.invoke('send-reminder-emails', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      const enqueued = data?.enqueued || 0;
      if (enqueued > 0) {
        toast.success(`${enqueued} reminder email${enqueued > 1 ? 's' : ''} queued for delivery`);
      } else {
        toast.info('No reminders to send right now — all caught up!');
      }
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
    const updated = { ...current, [timingKey]: !current[timingKey] };
    await updateCategory(category, { timing_config: updated });
  };

  return (
    <div>
      <SettingsNav />
      <div className="page-header">
        <h1 className="page-title">Reminder Settings</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Configure how and when LocumOps reminds you about important tasks.
      </p>

      <div className="grid gap-6 max-w-2xl">
        {/* Manual Send */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" /> Send Reminders Now
            </CardTitle>
            <CardDescription>
              Manually trigger invoice reminder emails based on your current data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleSendRemindersNow}
              disabled={sendingReminders || isDemo}
              className="gap-2"
            >
              {sendingReminders ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {sendingReminders ? 'Sending…' : 'Send invoice reminders now'}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Checks for draft and overdue invoices and sends email reminders. Won't send duplicates for the same day.
            </p>
          </CardContent>
        </Card>

        {/* Delivery Channels */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" /> Delivery Channels
            </CardTitle>
            <CardDescription>Choose how you receive reminders</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Email reminders</span>
              </div>
              <Switch checked={prefs.email_enabled} onCheckedChange={() => handleToggleChannel('email_enabled')} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">SMS reminders</span>
              </div>
              <Switch checked={prefs.sms_enabled} onCheckedChange={() => handleToggleChannel('sms_enabled')} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">In-app reminders</span>
              </div>
              <Switch checked={prefs.in_app_enabled} onCheckedChange={() => handleToggleChannel('in_app_enabled')} />
            </div>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact Info</CardTitle>
            <CardDescription>Where should we send reminders?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Reminder email</Label>
              <Input
                type="email"
                placeholder="you@example.com"
                defaultValue={prefs.reminder_email || ''}
                onBlur={(e) => handleFieldUpdate('reminder_email', e.target.value || null)}
              />
            </div>
            <div>
              <Label>Mobile phone number</Label>
              <Input
                type="tel"
                placeholder="+1 (555) 000-0000"
                defaultValue={prefs.phone_number || ''}
                onBlur={(e) => handleFieldUpdate('phone_number', e.target.value || null)}
              />
              <p className="text-xs text-muted-foreground mt-1">Used for SMS reminders only</p>
            </div>
          </CardContent>
        </Card>

        {/* Reminder Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reminder Categories</CardTitle>
            <CardDescription>Toggle reminders per workflow area</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {CATEGORIES.map(cat => {
                const setting = categories.find(c => c.category === cat);
                if (!setting) return null;
                return (
                  <div key={cat} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{CATEGORY_LABELS[cat]}</span>
                      <Switch
                        checked={setting.enabled}
                        onCheckedChange={(val) => handleCategoryToggle(cat, 'enabled', val)}
                      />
                    </div>
                    {setting.enabled && (
                      <div className="pl-4 border-l-2 border-border space-y-2">
                        <div className="flex gap-4">
                          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                            <Checkbox
                              checked={setting.email_enabled}
                              onCheckedChange={(val) => handleCategoryToggle(cat, 'email_enabled', !!val)}
                            />
                            Email
                          </label>
                          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                            <Checkbox
                              checked={setting.sms_enabled}
                              onCheckedChange={(val) => handleCategoryToggle(cat, 'sms_enabled', !!val)}
                            />
                            SMS
                          </label>
                          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                            <Checkbox
                              checked={setting.in_app_enabled}
                              onCheckedChange={(val) => handleCategoryToggle(cat, 'in_app_enabled', !!val)}
                            />
                            In-app
                          </label>
                        </div>
                        {/* Timing */}
                        <div className="flex flex-wrap gap-2">
                          {TIMING_OPTIONS.map(opt => {
                            const timingConfig = setting.timing_config || {};
                            return (
                              <label key={opt.key} className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
                                <Checkbox
                                  checked={!!timingConfig[opt.key]}
                                  onCheckedChange={() => handleTimingToggle(cat, opt.key)}
                                />
                                {opt.label}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Quiet Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Quiet Hours
            </CardTitle>
            <CardDescription>Block SMS during these hours</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start</Label>
                <Input
                  type="time"
                  defaultValue={prefs.quiet_hours_start || '22:00'}
                  onBlur={(e) => handleFieldUpdate('quiet_hours_start', e.target.value || null)}
                />
              </div>
              <div>
                <Label>End</Label>
                <Input
                  type="time"
                  defaultValue={prefs.quiet_hours_end || '07:00'}
                  onBlur={(e) => handleFieldUpdate('quiet_hours_end', e.target.value || null)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Digest */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Digest Summary</CardTitle>
            <CardDescription>Get a periodic summary instead of individual reminders</CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={prefs.digest_frequency}
              onValueChange={(val) => handleFieldUpdate('digest_frequency', val)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
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
