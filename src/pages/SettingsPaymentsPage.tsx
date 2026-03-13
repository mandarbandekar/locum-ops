import { useState } from 'react';
import { SettingsNav } from '@/components/SettingsNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

interface PaymentMethod {
  key: string;
  label: string;
  enabled: boolean;
  instructions: string;
}

const DEFAULT_METHODS: PaymentMethod[] = [
  { key: 'ach', label: 'ACH / Bank Transfer', enabled: false, instructions: '' },
  { key: 'check', label: 'Check', enabled: false, instructions: '' },
  { key: 'zelle', label: 'Zelle', enabled: false, instructions: '' },
  { key: 'paypal', label: 'PayPal', enabled: false, instructions: '' },
  { key: 'venmo', label: 'Venmo', enabled: false, instructions: '' },
];

export default function SettingsPaymentsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>(DEFAULT_METHODS);
  const [saving, setSaving] = useState(false);

  const toggleMethod = (key: string) => {
    setMethods(prev => prev.map(m => m.key === key ? { ...m, enabled: !m.enabled } : m));
  };

  const updateInstructions = (key: string, instructions: string) => {
    setMethods(prev => prev.map(m => m.key === key ? { ...m, instructions } : m));
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('Payment settings saved');
    }, 300);
  };

  return (
    <div>
      <SettingsNav />
      <div className="page-header">
        <h1 className="page-title">Payments</h1>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="mr-1 h-4 w-4" /> {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Configure accepted payment methods shown on your invoices. This is presentation-only — not a payment processor setup.
      </p>

      <div className="grid gap-4 max-w-2xl">
        {methods.map(method => (
          <Card key={method.key}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{method.label}</CardTitle>
                <Switch checked={method.enabled} onCheckedChange={() => toggleMethod(method.key)} />
              </div>
            </CardHeader>
            {method.enabled && (
              <CardContent>
                <Label>Display instructions</Label>
                <Input
                  value={method.instructions}
                  onChange={e => updateInstructions(method.key, e.target.value)}
                  placeholder={
                    method.key === 'ach' ? 'Routing: ••• / Account: •••'
                    : method.key === 'check' ? 'Make payable to: Smith Veterinary Services LLC'
                    : method.key === 'zelle' ? 'jane@example.com'
                    : method.key === 'paypal' ? 'paypal.me/janesmith'
                    : '@janesmith'
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">Shown on invoices when this method is enabled.</p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
