import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowRight, Bell, Mail, MessageSquare, FileText, ShieldCheck, Lightbulb } from 'lucide-react';
import { useReminderPreferences } from '@/hooks/useReminderPreferences';

interface OnboardingRemindersStepProps {
  onContinue: () => void;
}

const ONBOARDING_CATEGORIES = [
  {
    group: 'Invoices',
    icon: FileText,
    items: [
      { key: 'invoices', label: 'Invoice ready for review', description: 'When a new invoice is generated from your shifts' },
      { key: 'invoices_overdue', label: 'Overdue invoices', description: 'When an invoice passes its due date' },
    ],
  },
  {
    group: 'Credentials',
    icon: ShieldCheck,
    items: [
      { key: 'credentials', label: 'Credential expirations', description: '60-day advance notice before a license expires' },
      { key: 'credentials_ce', label: 'CE deadlines', description: 'When CE hours are due for a credential' },
    ],
  },
] as const;

export function OnboardingRemindersStep({ onContinue }: OnboardingRemindersStepProps) {
  const { prefs, categories, loading, updatePrefs, updateCategory } = useReminderPreferences();

  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  // Track which categories the user wants enabled (all on by default)
  const [enabledCategories, setEnabledCategories] = useState<Record<string, boolean>>({
    invoices: true,
    invoices_overdue: true,
    credentials: true,
    credentials_ce: true,
  });

  const toggleCategory = (key: string) => {
    setEnabledCategories(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleContinue = async () => {
    if (!prefs || loading) return;
    setSaving(true);

    try {
      // Save channel preferences
      await updatePrefs({
        email_enabled: emailEnabled,
        sms_enabled: smsEnabled,
        phone_number: smsEnabled && phone.trim() ? phone.trim() : prefs.phone_number,
      });

      // Map onboarding categories to DB categories
      // "invoices" category covers both ready-for-review and overdue
      const invoicesEnabled = enabledCategories.invoices || enabledCategories.invoices_overdue;
      const credentialsEnabled = enabledCategories.credentials || enabledCategories.credentials_ce;

      await updateCategory('invoices', {
        enabled: invoicesEnabled,
        email_enabled: emailEnabled && invoicesEnabled,
        sms_enabled: smsEnabled && invoicesEnabled,
      });

      await updateCategory('credentials', {
        enabled: credentialsEnabled,
        email_enabled: emailEnabled && credentialsEnabled,
        sms_enabled: smsEnabled && credentialsEnabled,
      });
    } catch (e) {
      console.error('Failed to save reminder preferences', e);
    }

    setSaving(false);
    onContinue();
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-foreground font-[Manrope]">How should we notify you?</h2>
        <p className="text-muted-foreground mt-1">
          Choose your preferred channels and what you'd like alerts for.
        </p>
      </div>

      {/* Channel toggles */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Channels</p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <Label className="font-medium">Email</Label>
            </div>
            <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <Label className="font-medium">SMS</Label>
              </div>
              <Switch checked={smsEnabled} onCheckedChange={setSmsEnabled} />
            </div>

            {smsEnabled && (
              <div className="ml-6">
                <Input
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  We'll only text you for high-priority alerts like overdue invoices.
                </p>
              </div>
            )}

            {smsEnabled && !phone.trim() && (
              <p className="text-xs text-destructive ml-6">
                ⚠ Enter your phone number to receive SMS alerts.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Category toggles */}
      <Card>
        <CardContent className="p-4 space-y-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">What to notify you about</p>

          {ONBOARDING_CATEGORIES.map(group => (
            <div key={group.group} className="space-y-3">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <group.icon className="h-4 w-4 text-primary" />
                {group.group}
              </div>
              {group.items.map(item => (
                <label
                  key={item.key}
                  className="flex items-start gap-3 cursor-pointer ml-1"
                >
                  <Checkbox
                    checked={enabledCategories[item.key]}
                    onCheckedChange={() => toggleCategory(item.key)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground leading-tight">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </label>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>

      <Button
        onClick={handleContinue}
        className="w-full"
        size="lg"
        disabled={saving || loading}
      >
        {saving ? 'Saving…' : 'Continue'} <ArrowRight className="ml-2 h-4 w-4" />
      </Button>

      {/* Tip */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
        <Lightbulb className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
        <span>You can change these anytime in <strong>Settings → Reminders</strong>.</span>
      </div>
    </div>
  );
}
