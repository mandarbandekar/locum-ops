import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Check, Lightbulb } from 'lucide-react';
import { calculate1099Tax, calculateSCorpTax, TaxProfileV1 } from '@/lib/taxCalculatorV1';

interface Props {
  shiftRate: number | null;
  hasShiftData: boolean;
  timezone: string;
  onContinue: (taxEnabled: boolean) => void;
}

function getStateFromTimezone(tz: string): { code: string; label: string } {
  const map: Record<string, { code: string; label: string }> = {
    'America/New_York': { code: 'NY', label: 'NY' },
    'America/Chicago': { code: 'IL', label: 'IL' },
    'America/Denver': { code: 'CO', label: 'CO' },
    'America/Phoenix': { code: 'AZ', label: 'AZ' },
    'America/Los_Angeles': { code: 'CA', label: 'CA' },
    'America/Anchorage': { code: 'AK', label: 'AK' },
    'Pacific/Honolulu': { code: 'HI', label: 'HI' },
  };
  return map[tz] || { code: '', label: 'State' };
}

export function OnboardingTaxStep({ shiftRate, hasShiftData, timezone, onContinue }: Props) {
  const [taxEnabled, setTaxEnabled] = useState(hasShiftData);

  const rate = shiftRate || 650;
  const annualIncome = rate * 240;
  const quarterlyIncome = rate * 60;
  const { code: stateCode, label: stateLabel } = getStateFromTimezone(timezone);

  const taxResult = useMemo(() => {
    const profile: TaxProfileV1 = {
      entityType: '1099',
      annualReliefIncome: annualIncome,
      scorpSalary: 0,
      extraWithholding: 0,
      payPeriodsPerYear: 24,
      filingStatus: 'single',
      spouseW2Income: 0,
      retirementContributions: 0,
      annualBusinessExpenses: 0,
      stateKey: stateCode,
    };
    return calculate1099Tax(profile);
  }, [annualIncome, stateCode]);

  const scorpSavings = useMemo(() => {
    const scorpProfile: TaxProfileV1 = {
      entityType: 'scorp',
      annualReliefIncome: annualIncome,
      scorpSalary: Math.round(annualIncome * 0.4),
      extraWithholding: 0,
      payPeriodsPerYear: 24,
      filingStatus: 'single',
      spouseW2Income: 0,
      retirementContributions: 0,
      annualBusinessExpenses: 0,
      stateKey: stateCode,
    };
    const scorpResult = calculateSCorpTax(scorpProfile);
    const sole1099Annual = taxResult.annualEstimatedTaxDue;
    const scorpAnnual = scorpResult.annualEstimatedTaxDue + scorpResult.totalAlreadyWithheld;
    return Math.max(0, Math.round((sole1099Annual - scorpAnnual) / 4));
  }, [annualIncome, stateCode, taxResult]);

  // Expose for parent sticky CTA
  const handleFinish = () => onContinue(taxEnabled);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground font-[Manrope]">Tax Intelligence</h2>
        <p className="text-muted-foreground">
          {hasShiftData
            ? "Here's a preview of your estimated taxes based on your first shift."
            : 'Enable Tax Intelligence to automatically estimate your quarterly taxes as you log shifts.'}
        </p>
      </div>

      {hasShiftData ? (
        <>
          {/* Tax Snapshot Card */}
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/[0.03] to-transparent">
            <CardContent className="p-4 space-y-4">
              <div>
                <p className="font-semibold text-foreground">Your tax snapshot</p>
                <p className="text-sm text-muted-foreground">Here's what you'd owe this quarter if you keep this pace.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/30">
                  <p className="text-xs text-muted-foreground mb-1">Est. quarterly tax</p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 animate-scale-up">
                    ${taxResult.quarterlyPayment.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="text-center p-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200/50 dark:border-green-800/30">
                  <p className="text-xs text-muted-foreground mb-1">Projected quarterly income</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400 animate-scale-up">
                    ${quarterlyIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Federal income (est.)</span>
                  <span className="font-medium">${Math.round(taxResult.vetFederalShare / 4).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Self-employment tax</span>
                  <span className="font-medium">${Math.round(taxResult.totalSeTax / 4).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">{stateLabel} state (est.)</span>
                  <span className="font-medium">${Math.round(taxResult.stateTax / 4).toLocaleString()}</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Based on ~60 shift-days/quarter at ${rate}/day · {taxResult.effectiveRate}% effective rate · Refines as you log more shifts
              </p>

              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">How we calculate this</p>
                <p className="text-xs text-muted-foreground">
                  We project your annual income based on your day rate and ~240 shift-days per year. Taxes are calculated using 2025 federal progressive brackets, self-employment tax (15.3% on 92.35% of net income with Social Security wage cap), and state-specific rates. These numbers refine automatically as you log more shifts throughout the year.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* S-Corp Savings Nudge */}
          <Card className="bg-muted/30">
            <CardContent className="p-4 flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  At your current rate, an S-Corp election could save you ~${scorpSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}/quarter.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your Tax Center tracks whether an S-Corp structure could reduce your self-employment tax — review it anytime.
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="bg-muted/20 border-dashed">
          <CardContent className="p-5 text-center space-y-3">
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
          </CardContent>
        </Card>
      )}

      {/* Tax toggle + disclaimer */}
      <div className="space-y-3">
        <div className="space-y-1.5">
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
        </div>

        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">
            These estimates are based on standard self-employment tax rates and federal/state brackets. LocumOps does not provide tax, legal, or financial advice. We recommend consulting a CPA for your specific situation.
          </p>
        </div>

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
