import { useState, useCallback } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Check } from 'lucide-react';
import TaxProjectionDisplay, { daysPerWeekToIndex, indexToDaysPerWeek } from '@/components/tax-intelligence/TaxProjectionDisplay';

interface Props {
  shiftRate: number | null;
  hasShiftData: boolean;
  timezone: string;
  onContinue: (taxEnabled: boolean) => void;
}

export function OnboardingTaxStep({ shiftRate, hasShiftData, timezone, onContinue }: Props) {
  const [taxEnabled, setTaxEnabled] = useState(hasShiftData);
  const [scheduleIndex, setScheduleIndex] = useState(1); // default "3 days/wk"

  const rate = shiftRate || 650;

  const handleFinish = () => onContinue(taxEnabled);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-foreground font-[Manrope]">Your tax snapshot</h2>
        <p className="text-sm text-muted-foreground">
          Here's what your quarter looks like if you keep this pace. Refines as you log more shifts.
        </p>
      </div>

      {hasShiftData ? (
        <TaxProjectionDisplay
          dayRate={rate}
          timezone={timezone}
          selectedScheduleIndex={scheduleIndex}
          onScheduleChange={setScheduleIndex}
          defaultExpanded={false}
          variant="onboarding"
        />
      ) : (
        <div className="rounded-xl bg-muted/20 border border-dashed p-5 text-center space-y-3">
          <p className="text-muted-foreground text-sm">
            Your Tax Center calculates estimated quarterly taxes from your shift income and tracks payment deadlines — no manual data entry needed.
          </p>
          <div className="rounded-xl bg-muted/50 p-5 opacity-50">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-background p-3 space-y-1">
                <div className="h-3 w-20 bg-muted rounded mx-auto" />
                <div className="h-6 w-16 bg-muted rounded mx-auto" />
              </div>
              <div className="rounded-lg bg-background p-3 space-y-1">
                <div className="h-3 w-20 bg-muted rounded mx-auto" />
                <div className="h-6 w-16 bg-muted rounded mx-auto" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tax toggle + disclaimer */}
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-lg border border-border">
          <Label htmlFor="tax-toggle" className="cursor-pointer text-sm font-medium">
            Keep tracking my taxes automatically
          </Label>
          <Switch
            id="tax-toggle"
            checked={taxEnabled}
            onCheckedChange={setTaxEnabled}
          />
        </div>
        <p className="text-xs text-muted-foreground px-1">You can always enable or disable this later in Settings → Business & Taxes.</p>

        {taxEnabled && (
          <p className="text-sm text-primary flex items-center gap-1.5 justify-center">
            <Check className="h-4 w-4" /> Tax tracker enabled
          </p>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">Your tax estimate updates as you log more shifts throughout the year.</p>

      {/* Hidden button for sticky CTA */}
      <button
        id="onboarding-tax-finish"
        type="button"
        onClick={handleFinish}
        className="hidden"
      />
    </div>
  );
}
