import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Info, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { US_STATES } from '@/lib/taxConstants2026';
import type { TaxIntelligenceProfile } from '@/hooks/useTaxIntelligence';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingProfile: TaxIntelligenceProfile | null;
  onSave: (data: Partial<TaxIntelligenceProfile>) => Promise<void>;
}

export default function TaxProfileSetup({ open, onOpenChange, existingProfile, onSave }: Props) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Form state
  const [entityType, setEntityType] = useState(existingProfile?.entity_type || 'sole_prop');
  const [showEntityHelper, setShowEntityHelper] = useState(false);
  const [filingStatus, setFilingStatus] = useState(existingProfile?.filing_status || 'single');
  const [stateCode, setStateCode] = useState(existingProfile?.state_code || '');
  const [hasOtherIncome, setHasOtherIncome] = useState((existingProfile?.other_w2_income ?? 0) > 0);
  const [otherW2Income, setOtherW2Income] = useState(existingProfile?.other_w2_income ?? 0);
  const [retirementType, setRetirementType] = useState(existingProfile?.retirement_type || 'none');
  const [retirementContribution, setRetirementContribution] = useState(existingProfile?.retirement_contribution ?? 0);
  const [expenseLevel, setExpenseLevel] = useState(existingProfile?.expense_tracking_level || 'none');
  const [ytdExpenses, setYtdExpenses] = useState(existingProfile?.ytd_expenses_estimate ?? 8000);
  const [scorpSalary, setScorpSalary] = useState(existingProfile?.scorp_salary ?? 0);
  const [safeHarbor, setSafeHarbor] = useState(existingProfile?.safe_harbor_method || '90_percent');
  const [priorYearTax, setPriorYearTax] = useState(existingProfile?.prior_year_tax_paid ?? 0);

  const isScorp = entityType === 'scorp';
  const totalSteps = isScorp ? 8 : 8;

  // Determine which steps to show based on entity type
  const getStepContent = () => {
    switch (step) {
      case 1: return renderEntityStep();
      case 2: return renderFilingStep();
      case 3: return renderStateStep();
      case 4: return renderOtherIncomeStep();
      case 5: return renderRetirementStep();
      case 6: return isScorp ? renderScorpSalaryStep() : renderExpensesStep();
      case 7: return isScorp ? renderExpensesStep() : renderSafeHarborStep();
      case 8: return isScorp ? renderSafeHarborStep() : renderCompletionStep();
      case 9: return renderCompletionStep();
      default: return null;
    }
  };

  const maxStep = isScorp ? 9 : 8;
  const progressPct = Math.round((step / maxStep) * 100);

  function renderEntityStep() {
    return (
      <div className="space-y-4">
        <Label className="text-base font-medium">How are you currently set up for tax purposes?</Label>
        <RadioGroup value={entityType} onValueChange={v => { setEntityType(v); setShowEntityHelper(v === 'unsure'); }}>
          <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer">
            <RadioGroupItem value="sole_prop" id="sole_prop" />
            <Label htmlFor="sole_prop" className="cursor-pointer flex-1">I file as a sole proprietor / 1099 independent contractor</Label>
          </div>
          <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer">
            <RadioGroupItem value="scorp" id="scorp" />
            <Label htmlFor="scorp" className="cursor-pointer flex-1">I have an S-Corporation</Label>
          </div>
          <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer">
            <RadioGroupItem value="unsure" id="unsure" />
            <Label htmlFor="unsure" className="cursor-pointer flex-1">I'm not sure yet</Label>
          </div>
        </RadioGroup>
        {(showEntityHelper || entityType === 'unsure') && (
          <Alert className="border-[hsl(var(--info))] bg-[hsl(var(--chip-info-bg))]">
            <Info className="h-4 w-4 text-[hsl(var(--chip-info-text))]" />
            <AlertDescription className="text-sm text-[hsl(var(--chip-info-text))]">
              You should consider an S-Corp if you're consistently netting over <strong>$80,000/year</strong> from relief work. Below that, the setup costs (payroll service, additional accounting — typically $2,500–$4,000/year) usually outweigh the SE tax savings.
            </AlertDescription>
          </Alert>
        )}
        {entityType === 'unsure' && (
          <div className="pt-2">
            <Label className="text-sm">Based on this, which applies to you?</Label>
            <RadioGroup value="" onValueChange={v => { setEntityType(v); setShowEntityHelper(false); }} className="mt-2">
              <div className="flex items-center space-x-2 p-2 rounded border hover:bg-accent/50 cursor-pointer">
                <RadioGroupItem value="sole_prop" id="sp2" />
                <Label htmlFor="sp2" className="cursor-pointer text-sm">Sole Proprietor</Label>
              </div>
              <div className="flex items-center space-x-2 p-2 rounded border hover:bg-accent/50 cursor-pointer">
                <RadioGroupItem value="scorp" id="sc2" />
                <Label htmlFor="sc2" className="cursor-pointer text-sm">S-Corporation</Label>
              </div>
            </RadioGroup>
          </div>
        )}
      </div>
    );
  }

  function renderFilingStep() {
    return (
      <div className="space-y-4">
        <Label className="text-base font-medium">What is your federal filing status?</Label>
        <RadioGroup value={filingStatus} onValueChange={setFilingStatus}>
          {[
            { value: 'single', label: 'Single' },
            { value: 'married_joint', label: 'Married filing jointly' },
            { value: 'head_of_household', label: 'Head of household' },
          ].map(o => (
            <div key={o.value} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer">
              <RadioGroupItem value={o.value} id={o.value} />
              <Label htmlFor={o.value} className="cursor-pointer flex-1">{o.label}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    );
  }

  function renderStateStep() {
    return (
      <div className="space-y-4">
        <Label className="text-base font-medium">Which state do you live in?</Label>
        <Select value={stateCode} onValueChange={setStateCode}>
          <SelectTrigger><SelectValue placeholder="Select a state…" /></SelectTrigger>
          <SelectContent className="max-h-64">
            {US_STATES.map(s => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    );
  }

  function renderOtherIncomeStep() {
    return (
      <div className="space-y-4">
        <Label className="text-base font-medium">Does your household have other W-2 income this year?</Label>
        <p className="text-sm text-muted-foreground">e.g., a spouse's salary</p>
        <RadioGroup value={hasOtherIncome ? 'yes' : 'no'} onValueChange={v => { setHasOtherIncome(v === 'yes'); if (v === 'no') setOtherW2Income(0); }}>
          <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer">
            <RadioGroupItem value="yes" id="oi-yes" />
            <Label htmlFor="oi-yes" className="cursor-pointer">Yes</Label>
          </div>
          <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer">
            <RadioGroupItem value="no" id="oi-no" />
            <Label htmlFor="oi-no" className="cursor-pointer">No</Label>
          </div>
        </RadioGroup>
        {hasOtherIncome && (
          <div className="space-y-1">
            <Label className="text-sm">Approximate amount</Label>
            <Input type="number" value={otherW2Income || ''} onChange={e => setOtherW2Income(Number(e.target.value))} placeholder="e.g., 65000" />
          </div>
        )}
      </div>
    );
  }

  function renderRetirementStep() {
    return (
      <div className="space-y-4">
        <Label className="text-base font-medium">Are you contributing to a retirement account this year?</Label>
        <RadioGroup value={retirementType} onValueChange={setRetirementType}>
          {[
            { value: 'sep_ira', label: 'SEP-IRA' },
            { value: 'solo_401k', label: 'Solo 401(k)' },
            { value: 'simple_ira', label: 'SIMPLE IRA' },
            { value: 'none', label: 'No retirement contributions currently' },
          ].map(o => (
            <div key={o.value} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer">
              <RadioGroupItem value={o.value} id={`ret-${o.value}`} />
              <Label htmlFor={`ret-${o.value}`} className="cursor-pointer flex-1">{o.label}</Label>
            </div>
          ))}
        </RadioGroup>
        {retirementType !== 'none' && (
          <div className="space-y-1">
            <Label className="text-sm">Planned annual contribution ($)</Label>
            <Input type="number" value={retirementContribution || ''} onChange={e => setRetirementContribution(Number(e.target.value))} placeholder="e.g., 10000" />
          </div>
        )}
      </div>
    );
  }

  function renderExpensesStep() {
    return (
      <div className="space-y-4">
        <Label className="text-base font-medium">Do you track deductible business expenses?</Label>
        <RadioGroup value={expenseLevel} onValueChange={setExpenseLevel}>
          <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer">
            <RadioGroupItem value="careful" id="exp-careful" />
            <Label htmlFor="exp-careful" className="cursor-pointer flex-1">Yes, I track them carefully</Label>
          </div>
          <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer">
            <RadioGroupItem value="estimate" id="exp-est" />
            <Label htmlFor="exp-est" className="cursor-pointer flex-1">I have some but I'm not sure of the total</Label>
          </div>
          <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer">
            <RadioGroupItem value="none" id="exp-none" />
            <Label htmlFor="exp-none" className="cursor-pointer flex-1">I don't really track them</Label>
          </div>
        </RadioGroup>

        {expenseLevel === 'careful' && (
          <div className="space-y-1">
            <Label className="text-sm">YTD total so far ($)</Label>
            <Input type="number" value={ytdExpenses || ''} onChange={e => setYtdExpenses(Number(e.target.value))} placeholder="e.g., 8500" />
          </div>
        )}

        {expenseLevel === 'estimate' && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Most relief vets in your income range have $6,000–$12,000 in deductible expenses annually. Pick a starting estimate:</p>
            <div className="px-2">
              <Slider value={[ytdExpenses]} onValueChange={v => setYtdExpenses(v[0])} min={3000} max={20000} step={500} />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>$3,000</span>
                <span className="font-medium text-foreground">${ytdExpenses.toLocaleString()}</span>
                <span>$20,000</span>
              </div>
            </div>
          </div>
        )}

        {expenseLevel === 'none' && (
          <Alert className="border-[hsl(var(--warning))] bg-[hsl(var(--chip-warning-bg))]">
            <Info className="h-4 w-4 text-[hsl(var(--chip-warning-text))]" />
            <AlertDescription className="text-sm text-[hsl(var(--chip-warning-text))]">
              You may be overpaying taxes. We'll remind you to log expenses — it takes under 2 minutes per week.
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  function renderScorpSalaryStep() {
    return (
      <div className="space-y-4">
        <Label className="text-base font-medium">What W-2 salary do you pay yourself through your S-Corp?</Label>
        <Input type="number" value={scorpSalary || ''} onChange={e => setScorpSalary(Number(e.target.value))} placeholder="e.g., 60000" />
        {(scorpSalary > 0 && scorpSalary < 40000) && (
          <Alert className="border-[hsl(var(--warning))] bg-[hsl(var(--chip-warning-bg))]">
            <Info className="h-4 w-4 text-[hsl(var(--chip-warning-text))]" />
            <AlertDescription className="text-sm text-[hsl(var(--chip-warning-text))]">
              IRS requires "reasonable compensation." Most relief vet CPAs recommend 40–60% of net profit as salary.
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  function renderSafeHarborStep() {
    return (
      <div className="space-y-4">
        <Label className="text-base font-medium">How would you like us to calculate your quarterly estimates?</Label>
        <RadioGroup value={safeHarbor} onValueChange={setSafeHarbor}>
          <div className="flex items-start space-x-2 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer">
            <RadioGroupItem value="90_percent" id="sh-90" className="mt-0.5" />
            <div>
              <Label htmlFor="sh-90" className="cursor-pointer font-medium">Based on this year's projected income (90% method)</Label>
              <p className="text-xs text-muted-foreground mt-0.5">More accurate but varies quarter to quarter</p>
            </div>
          </div>
          <div className="flex items-start space-x-2 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer">
            <RadioGroupItem value="safe_harbor" id="sh-prior" className="mt-0.5" />
            <div>
              <Label htmlFor="sh-prior" className="cursor-pointer font-medium">Based on last year's tax liability (safe harbor method)</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Steadier, avoids underpayment penalties</p>
            </div>
          </div>
        </RadioGroup>
        {safeHarbor === 'safe_harbor' && (
          <div className="space-y-1">
            <Label className="text-sm">Last year's total federal tax paid ($)</Label>
            <Input type="number" value={priorYearTax || ''} onChange={e => setPriorYearTax(Number(e.target.value))} placeholder="e.g., 18000" />
          </div>
        )}
      </div>
    );
  }

  function renderCompletionStep() {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-[hsl(var(--chip-success-bg))] flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-[hsl(var(--chip-success-text))]" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Your Tax Profile is {existingProfile ? 'Updated' : 'Set'}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            We'll now calculate your quarterly estimates automatically as you log shifts. You can update this profile any time from Settings or the Tax Dashboard.
          </p>
        </div>
      </div>
    );
  }

  const isLastStep = (isScorp && step === 9) || (!isScorp && step === 8);

  async function handleComplete() {
    setSaving(true);
    await onSave({
      entity_type: entityType === 'unsure' ? 'sole_prop' : entityType,
      filing_status: filingStatus,
      state_code: stateCode,
      other_w2_income: otherW2Income,
      retirement_type: retirementType,
      retirement_contribution: retirementType !== 'none' ? retirementContribution : 0,
      expense_tracking_level: expenseLevel,
      ytd_expenses_estimate: expenseLevel !== 'none' ? ytdExpenses : 0,
      scorp_salary: isScorp ? scorpSalary : 0,
      safe_harbor_method: safeHarbor,
      prior_year_tax_paid: safeHarbor === 'safe_harbor' ? priorYearTax : 0,
      setup_completed_at: new Date().toISOString(),
    });
    setSaving(false);
    toast.success(existingProfile ? 'Tax profile updated' : 'Tax profile created');
    onOpenChange(false);
    setStep(1);
  }

  const canProceed = () => {
    if (step === 1) return entityType !== 'unsure';
    if (step === 3) return stateCode !== '';
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {existingProfile ? 'Edit Tax Profile' : 'Set Up Your Tax Profile'}
          </DialogTitle>
        </DialogHeader>

        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Step {step} of {maxStep}</span>
            <span>{progressPct}%</span>
          </div>
          <Progress value={progressPct} className="h-1.5" />
        </div>

        <div className="min-h-[200px]">
          {getStepContent()}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => step > 1 ? setStep(step - 1) : onOpenChange(false)} size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          {isLastStep ? (
            <Button onClick={handleComplete} disabled={saving} size="sm">
              {saving ? 'Saving…' : 'Complete Setup'}
              <CheckCircle2 className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed()} size="sm">
              Next
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
