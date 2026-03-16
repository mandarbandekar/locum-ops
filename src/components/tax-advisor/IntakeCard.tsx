import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ClipboardCheck } from 'lucide-react';
import type { TaxAdvisorProfile } from '@/hooks/useTaxAdvisor';

interface Props {
  profile: TaxAdvisorProfile | null;
  onSave: (data: Partial<TaxAdvisorProfile>) => Promise<void>;
}

const boolFields = [
  { key: 'travels_for_ce', label: 'Do you travel for CE or locum work?' },
  { key: 'uses_personal_vehicle', label: 'Do you use your personal vehicle for work?' },
  { key: 'multi_state_work', label: 'Do you work in multiple states?' },
  { key: 'pays_own_subscriptions', label: 'Do you pay for your own subscriptions or memberships?' },
  { key: 'retirement_planning_interest', label: 'Are you interested in retirement planning topics?' },
  { key: 'combines_business_personal_travel', label: 'Do you combine business travel with personal travel?' },
  { key: 'buys_supplies_equipment', label: 'Do you buy supplies or equipment for work?' },
] as const;

export function IntakeCard({ profile, onSave }: Props) {
  const [entityType, setEntityType] = useState(profile?.entity_type || 'sole_proprietor');
  const [bools, setBools] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setEntityType(profile.entity_type);
      const b: Record<string, boolean> = {};
      boolFields.forEach(f => { b[f.key] = (profile as any)[f.key] ?? false; });
      setBools(b);
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ entity_type: entityType, ...bools } as any);
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          Your Planning Profile
        </CardTitle>
        <CardDescription>Help us tailor suggestions to your situation.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>Work / Entity Type</Label>
          <Select value={entityType} onValueChange={setEntityType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sole_proprietor">1099 / Sole Proprietor</SelectItem>
              <SelectItem value="s_corp">S-Corp</SelectItem>
              <SelectItem value="llc">LLC</SelectItem>
              <SelectItem value="mixed">Mixed / Multiple</SelectItem>
              <SelectItem value="unsure">Not sure yet</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          {boolFields.map(f => (
            <div key={f.key} className="flex items-center justify-between gap-3">
              <Label className="text-sm font-normal leading-snug">{f.label}</Label>
              <Switch
                checked={bools[f.key] ?? false}
                onCheckedChange={v => setBools(prev => ({ ...prev, [f.key]: v }))}
              />
            </div>
          ))}
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? 'Saving…' : profile ? 'Update Profile' : 'Save Profile'}
        </Button>
      </CardContent>
    </Card>
  );
}
