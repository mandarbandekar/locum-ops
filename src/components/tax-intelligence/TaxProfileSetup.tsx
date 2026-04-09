import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { CheckCircle2, Info, ArrowLeft, ArrowRight, Sparkles, CalendarDays } from 'lucide-react';
import { US_STATES, getMarginalRate, STANDARD_DEDUCTIONS, type FilingStatus } from '@/lib/taxConstants2026';
import { getStateInfo, STATE_TAX_DATA } from '@/lib/stateTaxData';
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
  const [pteElected, setPteElected] = useState(existingProfile?.pte_elected ?? false);
  const [pteChoice, setPteChoice] = useState<'yes' | 'no' | 'idk'>(existingProfile?.pte_elected ? 'yes' : 'no');
  const [spouseW2Income, setSpouseW2Income] = useState(existingProfile?.spouse_w2_income ?? 0);
  const [spouseHasSE, setSpouseHasSE] = useState(existingProfile?.spouse_has_se_income ?? false);
  const [spouseSENet, setSpouseSENet] = useState(existingProfile?.spouse_se_net_income ?? 0);
  const [retirementType, setRetirementType] = useState(existingProfile?.retirement_type || 'none');
  const [retirementContribution, setRetirementContribution] = useState(existingProfile?.retirement_contribution ?? 0);
  const [expenseLevel, setExpenseLevel] = useState(existingProfile?.expense_tracking_level || 'none');
  const [ytdExpenses, setYtdExpenses] = useState(existingProfile?.ytd_expenses_estimate ?? 8000);
  const [scorpSalary, setScorpSalary] = useState(existingProfile?.scorp_salary ?? 0);
  const [safeHarbor, setSafeHarbor] = useState(existingProfile?.safe_harbor_method || '90_percent');
  const [priorYearTax, setPriorYearTax] = useState(existingProfile?.prior_year_tax_paid ?? 0);
  const [priorYearIncome, setPriorYearIncome] = useState(existingProfile?.prior_year_total_income ?? 0);

  const isScorp = entityType === 'scorp';
  const currentYear = new Date().getFullYear();
  const stateData = stateCode ? STATE_TAX_DATA[stateCode] : null;
  const showPTEStep = isScorp && stateData?.hasPTE === true;

  // Dynamic steps
  const steps = useMemo(() => {
    const s: string[] = ['entity', 'filing', 'state'];
    if (showPTEStep) s.push('pte');
    s.push('household', 'retirement');
    if (isScorp) s.push('scorpSalary');
    s.push('expenses', 'priorYearIncome', 'safeHarbor', 'complete');
    return s;
  }, [isScorp, showPTEStep]);

  const totalSteps = steps.length;
  const currentStepName = steps[step - 1] || 'entity';
  const progressPct = Math.round((step / totalSteps) * 100);

  const stateInfo = stateCode ? getStateInfo(stateCode) : null;

  // Compute household total for display
  const householdTotal = spouseW2Income + (spouseHasSE ? spouseSENet : 0);

  function renderStep() {
    switch (currentStepName) {
      case 'entity': return renderEntityStep();
      case 'filing': return renderFilingStep();
      case 'state': return renderStateStep();
      case 'pte': return renderPTEStep();
      case 'household': return renderHouseholdStep();
      case 'retirement': return renderRetirementStep();
      case 'scorpSalary': return renderScorpSalaryStep();
      case 'expenses': return renderExpensesStep();
      case 'priorYearIncome': return renderPriorYearIncomeStep();
      case 'safeHarbor': return renderSafeHarborStep();
      case 'complete': return renderCompletionStep();
      default: return null;
    }
  }

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
        {stateInfo && (
          <div className="space-y-1.5">
            <Badge variant="outline" className="text-xs font-normal py-1 px-2">
              {stateInfo.label}
            </Badge>
            {stateInfo.pteLabel && (
              <Badge variant="outline" className="text-xs font-normal py-1 px-2 ml-1">
                {stateInfo.pteLabel}
              </Badge>
            )}
          </div>
        )}
      </div>
    );
  }

  function renderPTEStep() {
    const pteRate = stateData?.pteRate ?? 0;
    const stateName = stateData?.name || stateCode;

    return (
      <div className="space-y-4">
        <Label className="text-base font-medium">Pass-Through Entity (PTE) Tax Election</Label>
        <p className="text-sm text-muted-foreground">
          {stateName} offers a PTE tax election for S-Corporations that can significantly reduce your federal tax bill.
        </p>
        <Alert className="border-[hsl(var(--info))] bg-[hsl(var(--chip-info-bg))]">
          <Info className="h-4 w-4 text-[hsl(var(--chip-info-text))]" />
          <AlertDescription className="text-sm text-[hsl(var(--chip-info-text))]">
            <strong>How it works:</strong> Your S-Corp pays state income tax at the entity level. That payment is fully deductible federally — bypassing the $10,000 SALT cap that applies to individuals.
          </AlertDescription>
        </Alert>
        <Label className="text-sm font-medium">Has your S-Corp elected PTE tax in {stateName}?</Label>
        <RadioGroup value={pteChoice} onValueChange={(v: string) => {
          const choice = v as 'yes' | 'no' | 'idk';
          setPteChoice(choice);
          setPteElected(choice === 'yes');
        }}>
          <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer">
            <RadioGroupItem value="yes" id="pte-yes" />
            <Label htmlFor="pte-yes" className="cursor-pointer flex-1">Yes — our S-Corp files and pays PTE tax</Label>
          </div>
          <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer">
            <RadioGroupItem value="no" id="pte-no" />
            <Label htmlFor="pte-no" className="cursor-pointer flex-1">No — we haven't elected PTE</Label>
          </div>
          <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer">
            <RadioGroupItem value="idk" id="pte-idk" />
            <Label htmlFor="pte-idk" className="cursor-pointer flex-1">I don't know — show me more</Label>
          </div>
        </RadioGroup>
        {pteChoice === 'idk' && (
          <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
            <p className="text-sm text-muted-foreground">
              At your projected income, electing PTE could save you an estimated amount in federal taxes annually by making your state tax bill federally deductible.
            </p>
            <p className="text-sm text-muted-foreground">
              The PTE rate in {stateName} is <strong>{(pteRate * 100).toFixed(1)}%</strong>. This election is made on your S-Corp state tax return. Ask your CPA or tax advisor whether this makes sense for your situation.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setPteChoice('no'); setPteElected(false); }}>
                I'll ask my CPA — set to No for now
              </Button>
              <Button variant="default" size="sm" onClick={() => { setPteChoice('yes'); setPteElected(true); }}>
                Yes, we've elected PTE
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderHouseholdStep() {
    return (
      <div className="space-y-4">
        <Label className="text-base font-medium">Household Income</Label>
        <p className="text-sm text-muted-foreground">This determines your federal tax bracket. Leave fields blank if not applicable.</p>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-sm">Spouse / partner W-2 gross income</Label>
            <Input
              type="number"
              value={spouseW2Income || ''}
              onChange={e => setSpouseW2Income(Number(e.target.value))}
              placeholder="e.g., 65000"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border">
            <Label className="text-sm cursor-pointer">Spouse has self-employment income?</Label>
            <Switch checked={spouseHasSE} onCheckedChange={v => { setSpouseHasSE(v); if (!v) setSpouseSENet(0); }} />
          </div>

          {spouseHasSE && (
            <div className="space-y-1">
              <Label className="text-sm">Spouse estimated net SE income</Label>
              <p className="text-xs text-muted-foreground">(net after their business expenses)</p>
              <Input
                type="number"
                value={spouseSENet || ''}
                onChange={e => setSpouseSENet(Number(e.target.value))}
                placeholder="e.g., 40000"
              />
            </div>
          )}

          {householdTotal > 0 && (
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Total additional household income (calculated)</p>
              <p className="text-lg font-semibold">${householdTotal.toLocaleString()}</p>
            </div>
          )}
        </div>
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

  function renderPriorYearIncomeStep() {
    return (
      <div className="space-y-4">
        <Label className="text-base font-medium">How much 1099 income did you earn last year?</Label>
        <p className="text-sm text-muted-foreground">
          This helps us project your full-year income more accurately, especially early in the year. Skip if you're new to relief work.
        </p>
        <div className="space-y-1">
          <Label className="text-sm">Total 1099 / self-employment income ({currentYear - 1})</Label>
          <Input
            type="number"
            value={priorYearIncome || ''}
            onChange={e => setPriorYearIncome(Number(e.target.value))}
            placeholder="e.g., 120000"
          />
        </div>
        {priorYearIncome > 0 && (
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Monthly average from last year</p>
            <p className="text-lg font-semibold">${Math.round(priorYearIncome / 12).toLocaleString()}/mo</p>
            <p className="text-xs text-muted-foreground mt-1">We'll use this to estimate income for months without scheduled shifts.</p>
          </div>
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

  const isLastStep = currentStepName === 'complete';

  async function handleComplete() {
    setSaving(true);
    await onSave({
      entity_type: entityType === 'unsure' ? 'sole_prop' : entityType,
      filing_status: filingStatus,
      state_code: stateCode,
      other_w2_income: 0, // Replaced by spouse fields
      retirement_type: retirementType,
      retirement_contribution: retirementType !== 'none' ? retirementContribution : 0,
      expense_tracking_level: expenseLevel,
      ytd_expenses_estimate: expenseLevel !== 'none' ? ytdExpenses : 0,
      scorp_salary: isScorp ? scorpSalary : 0,
      safe_harbor_method: safeHarbor,
      prior_year_tax_paid: safeHarbor === 'safe_harbor' ? priorYearTax : 0,
      pte_elected: showPTEStep ? pteElected : false,
      spouse_w2_income: spouseW2Income,
      spouse_has_se_income: spouseHasSE,
      spouse_se_net_income: spouseHasSE ? spouseSENet : 0,
      prior_year_total_income: priorYearIncome,
      setup_completed_at: new Date().toISOString(),
      spouse_se_net_income: spouseHasSE ? spouseSENet : 0,
      setup_completed_at: new Date().toISOString(),
    });
    setSaving(false);
    toast.success(existingProfile ? 'Tax profile updated' : 'Tax profile created');
    onOpenChange(false);
    setStep(1);
  }

  const canProceed = () => {
    if (currentStepName === 'entity') return entityType !== 'unsure';
    if (currentStepName === 'state') return stateCode !== '';
    if (currentStepName === 'pte') return pteChoice !== 'idk';
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
            <span>Step {step} of {totalSteps}</span>
            <span>{progressPct}%</span>
          </div>
          <Progress value={progressPct} className="h-1.5" />
        </div>

        <div className="min-h-[200px]">
          {renderStep()}
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
