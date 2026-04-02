import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Sparkles } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { TaxAdvisorProfile } from '@/hooks/useTaxAdvisor';

interface Props {
  profile: TaxAdvisorProfile | null;
  onSave: (data: Partial<TaxAdvisorProfile>) => Promise<void>;
}

const boolFields = [
  { key: 'travels_for_ce', label: 'Travel for CE or locum work?', hint: 'Surfaces CE & travel deduction insights' },
  { key: 'uses_personal_vehicle', label: 'Use personal vehicle for work?', hint: 'Unlocks vehicle & mileage strategies' },
  { key: 'multi_state_work', label: 'Work in multiple states?', hint: 'Highlights multi-state filing guidance' },
  { key: 'pays_own_subscriptions', label: 'Pay for subscriptions or memberships?', hint: 'Shows credential/membership deductions' },
  { key: 'retirement_planning_interest', label: 'Interested in retirement planning?', hint: 'Surfaces retirement account options' },
  { key: 'combines_business_personal_travel', label: 'Combine business & personal travel?', hint: 'Highlights home office & travel rules' },
  { key: 'buys_supplies_equipment', label: 'Buy supplies or equipment for work?', hint: 'Shows equipment deduction opportunities' },
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

  // Calculate completion
  const completedCount = (profile ? 1 : 0) + boolFields.filter(f => bools[f.key] === true).length;
  const totalFields = 1 + boolFields.length; // entity + bools
  const completionPct = Math.round((completedCount / totalFields) * 100);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ entity_type: entityType, ...bools } as any);
    setSaving(false);
    toast({
      title: 'Profile updated',
      description: 'Your Opportunity Review and advisor responses are now personalized.',
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          Personalize Your Results
        </CardTitle>
        <CardDescription className="text-xs">
          Answer these to get tailored tax insights and relevant CPA questions.
        </CardDescription>
        {/* Progress */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">{completedCount}/{totalFields} complete</span>
            <span className="text-xs text-muted-foreground">{completionPct}%</span>
          </div>
          <Progress value={completionPct} className="h-1.5" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Work / Entity Type</Label>
          <Select value={entityType} onValueChange={setEntityType}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sole_proprietor">1099 / Sole Proprietor</SelectItem>
              <SelectItem value="s_corp">S-Corp</SelectItem>
              <SelectItem value="llc">LLC</SelectItem>
              <SelectItem value="mixed">Mixed / Multiple</SelectItem>
              <SelectItem value="unsure">Not sure yet</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2.5">
          {boolFields.map(f => (
            <div key={f.key} className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Label className="text-xs font-normal leading-snug">{f.label}</Label>
                {!bools[f.key] && (
                  <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{f.hint}</p>
                )}
              </div>
              <Switch
                checked={bools[f.key] ?? false}
                onCheckedChange={v => setBools(prev => ({ ...prev, [f.key]: v }))}
                className="shrink-0"
              />
            </div>
          ))}
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full" size="sm">
          {saving ? 'Saving…' : profile ? 'Update Profile' : 'Save Profile'}
        </Button>
      </CardContent>
    </Card>
  );
}
