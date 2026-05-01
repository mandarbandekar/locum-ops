import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Info, ArrowLeft, ArrowRight, Sparkles, Plus, X } from 'lucide-react';
import { TAX_CONSTANTS, V1_US_STATES, V1_FILING_STATUS_LABELS, type V1FilingStatus } from '@/lib/taxConstants2026';
import { getV1MarginalRate } from '@/lib/taxCalculatorV1';
import type { TaxIntelligenceProfile, WorkStateAllocation } from '@/hooks/useTaxIntelligence';
import { toast } from 'sonner';
import TaxTerm from './TaxTerm';

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
  const [entityType, setEntityType] = useState(existingProfile?.entity_type || '1099');
  const [annualReliefIncome, setAnnualReliefIncome] = useState(existingProfile?.annual_relief_income ?? 0);
  const [scorpSalary, setScorpSalary] = useState(existingProfile?.scorp_salary ?? 0);
  const [annualBusinessExpenses, setAnnualBusinessExpenses] = useState(existingProfile?.annual_business_expenses ?? 0);
  const [filingStatus, setFilingStatus] = useState<string>(
    existingProfile?.filing_status === 'married_joint' ? 'married_joint'
    : existingProfile?.filing_status === 'head_of_household' ? 'head_of_household'
    : 'single'
  );
  const [spouseW2Income, setSpouseW2Income] = useState(existingProfile?.spouse_w2_income ?? 0);
  const [retirementContributions, setRetirementContributions] = useState(existingProfile?.retirement_contribution ?? 0);
  const [skipRetirement, setSkipRetirement] = useState(false);
  const [stateCode, setStateCode] = useState(existingProfile?.state_code || '');
  const [workStates, setWorkStates] = useState<WorkStateAllocation[]>(existingProfile?.work_states || []);
  const [multiStateOn, setMultiStateOn] = useState((existingProfile?.work_states?.length || 0) > 0);
  const [extraWithholding, setExtraWithholding] = useState(existingProfile?.extra_withholding ?? 0);
  const [payPeriodsPerYear, setPayPeriodsPerYear] = useState(existingProfile?.pay_periods_per_year ?? 24);
  const [hasExtraWithholding, setHasExtraWithholding] = useState((existingProfile?.extra_withholding ?? 0) > 0);
  const [mfjSpouseError, setMfjSpouseError] = useState(false);

  // Reset step when dialog opens
  useEffect(() => {
    if (open) setStep(1);
  }, [open]);

  const isScorp = entityType === 'scorp';

  // Steps
  const steps = useMemo(() => {
    const s = ['entity', 'income', 'filing', 'retirement', 'state'];
    if (isScorp) s.push('withholding');
    s.push('complete');
    return s;
  }, [isScorp]);

  const totalSteps = steps.length;
  const currentStepName = steps[step - 1] || 'entity';
  const progressPct = Math.round((step / totalSteps) * 100);

  // Live K-1 distribution calc for S-Corp
  const k1Distribution = useMemo(() => {
    if (!isScorp) return 0;
    const fica = (scorpSalary || 0) * TAX_CONSTANTS.employerFicaRate;
    return Math.max(0, (annualReliefIncome || 0) - (annualBusinessExpenses || 0) - (scorpSalary || 0) - fica);
  }, [isScorp, annualReliefIncome, annualBusinessExpenses, scorpSalary]);

  // Dynamic retirement savings preview
  const retirementSavings = useMemo(() => {
    if (retirementContributions <= 0) return 0;
    const taxable = Math.max(0, (annualReliefIncome || 0) - (annualBusinessExpenses || 0));
    const marginal = getV1MarginalRate(taxable, filingStatus);
    return Math.round(retirementContributions * marginal);
  }, [retirementContributions, annualReliefIncome, annualBusinessExpenses, filingStatus]);

  // State info after selection
  const stateInfo = useMemo(() => {
    if (!stateCode) return null;
    const state = TAX_CONSTANTS.states[stateCode];
    if (!state) return null;
    if (state.type === 'none') return { label: `${state.name} · No state income tax`, estimated: 0 };
    const net = Math.max(0, (annualReliefIncome || 0) - (annualBusinessExpenses || 0));
    let estimated = 0;
    if (state.type === 'flat') {
      estimated = Math.round(net * (state.rate ?? 0));
    }
    const rateLabel = state.type === 'flat'
      ? `Flat ${((state.rate ?? 0) * 100).toFixed(1)}%`
      : `Progressive brackets`;
    return { label: `${state.name} · ${rateLabel}`, estimated };
  }, [stateCode, annualReliefIncome, annualBusinessExpenses]);

  function renderStep() {
    switch (currentStepName) {
      case 'entity': return renderEntityStep();
      case 'income': return renderIncomeStep();
      case 'filing': return renderFilingStep();
      case 'retirement': return renderRetirementStep();
      case 'state': return renderStateStep();
      case 'withholding': return renderWithholdingStep();
      case 'complete': return renderCompleteStep();
      default: return null;
    }
  }

  function renderEntityStep() {
    return (
      <div className="space-y-4">
        <Label className="text-base font-medium">How are you structured?</Label>
        <RadioGroup value={entityType} onValueChange={v => setEntityType(v)}>
          <div className="p-4 rounded-lg border hover:bg-accent/50 cursor-pointer space-y-1">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="1099" id="ent-1099" />
              <Label htmlFor="ent-1099" className="cursor-pointer font-semibold">1099 / LLC Sole Proprietor</Label>
            </div>
            <p className="text-xs text-muted-foreground ml-6">You receive 1099-NEC forms and file <TaxTerm term="schedule_c">Schedule C</TaxTerm>.</p>
          </div>
          <div className="p-4 rounded-lg border hover:bg-accent/50 cursor-pointer space-y-1">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="scorp" id="ent-scorp" />
              <Label htmlFor="ent-scorp" className="cursor-pointer font-semibold">S-Corporation</Label>
            </div>
            <p className="text-xs text-muted-foreground ml-6">You pay yourself a <TaxTerm term="w2_salary">W-2 salary</TaxTerm> and take <TaxTerm term="k1_distribution">K-1 distributions</TaxTerm>.</p>
          </div>
        </RadioGroup>
        <Alert className="border-muted bg-muted/30">
          <Info className="h-4 w-4 text-muted-foreground" />
          <AlertDescription className="text-xs text-muted-foreground">
            <strong>Not sure?</strong> If you have a separate business bank account, run payroll through Gusto or QuickBooks, and file an <TaxTerm term="1120s">1120-S</TaxTerm> — you're S-Corp. If you receive 1099s directly and file <TaxTerm term="schedule_c">Schedule C</TaxTerm> — you're 1099.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  function renderIncomeStep() {
    if (isScorp) {
      return (
        <div className="space-y-4">
          <Label className="text-base font-medium">Your S-Corp income</Label>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-sm">Gross revenue expected this year (total billings)</Label>
              <Input type="number" value={annualReliefIncome || ''} onChange={e => setAnnualReliefIncome(Number(e.target.value))} placeholder="e.g., 200000" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Your <TaxTerm term="w2_salary">W-2 salary</TaxTerm> (what you pay yourself)</Label>
              <Input type="number" value={scorpSalary || ''} onChange={e => setScorpSalary(Number(e.target.value))} placeholder="e.g., 80000" />
              <p className="text-xs text-muted-foreground">IRS requires this to be <TaxTerm term="reasonable_compensation">reasonable compensation</TaxTerm>. Most relief vet CPAs recommend 40–60% of net profit.</p>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Operating business expenses</Label>
              <Input type="number" value={annualBusinessExpenses || ''} onChange={e => setAnnualBusinessExpenses(Number(e.target.value))} placeholder="e.g., 15000" />
              <p className="text-xs text-muted-foreground">Mileage, DEA fees, CE, equipment, software — before salary</p>
            </div>
            {annualReliefIncome > 0 && (
              <div className="rounded-lg bg-muted/50 p-3 border">
                <p className="text-xs text-muted-foreground">Your estimated <TaxTerm term="k1_distribution">K-1 distribution</TaxTerm></p>
                <p className="text-lg font-bold">${Math.round(k1Distribution).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Revenue − Expenses − Salary − <TaxTerm term="employer_fica">Employer FICA</TaxTerm></p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <Label className="text-base font-medium">Your relief vet income</Label>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-sm">Expected gross income this year (all relief work)</Label>
            <Input type="number" value={annualReliefIncome || ''} onChange={e => setAnnualReliefIncome(Number(e.target.value))} placeholder="e.g., 120000" />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Business expenses this year</Label>
            <Input type="number" value={annualBusinessExpenses || ''} onChange={e => setAnnualBusinessExpenses(Number(e.target.value))} placeholder="e.g., 10000" />
            <p className="text-xs text-muted-foreground">Mileage, DEA fees, CE, equipment, software, licensing</p>
          </div>
          <Alert className="border-muted bg-muted/30">
            <Info className="h-4 w-4 text-muted-foreground" />
            <AlertDescription className="text-xs text-muted-foreground">
              Not sure? Most relief vets deduct $8,000–$15,000 annually.{' '}
              <button className="text-primary hover:underline font-medium" onClick={() => setAnnualBusinessExpenses(10000)}>
                Use $10,000 as an estimate
              </button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  function renderFilingStep() {
    return (
      <div className="space-y-4">
        <Label className="text-base font-medium">Your household</Label>
        <div className="space-y-1">
          <Label className="text-sm">Filing status</Label>
          <RadioGroup value={filingStatus} onValueChange={v => { setFilingStatus(v); setMfjSpouseError(false); }}>
            {(['single', 'married_joint', 'head_of_household'] as V1FilingStatus[]).map(fs => (
              <div key={fs} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer">
                <RadioGroupItem value={fs} id={`fs-${fs}`} />
                <Label htmlFor={`fs-${fs}`} className="cursor-pointer flex-1">
                  {fs === 'married_joint' ? (
                    <TaxTerm term="filing_status_mfj">{V1_FILING_STATUS_LABELS[fs]}</TaxTerm>
                  ) : fs === 'head_of_household' ? (
                    <TaxTerm term="filing_status_hoh">{V1_FILING_STATUS_LABELS[fs]}</TaxTerm>
                  ) : (
                    V1_FILING_STATUS_LABELS[fs]
                  )}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {filingStatus === 'married_joint' && (
          <div className="space-y-2 mt-4 p-4 rounded-lg border bg-muted/20">
            <Label className="text-sm font-medium">Spouse income</Label>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Spouse W-2 gross income this year</Label>
              <Input
                type="number"
                value={spouseW2Income || ''}
                onChange={e => { setSpouseW2Income(Number(e.target.value)); setMfjSpouseError(false); }}
                placeholder="e.g., 65000"
              />
              <p className="text-xs text-muted-foreground">This affects your federal tax bracket significantly. Enter $0 if spouse has no income.</p>
            </div>
            {mfjSpouseError && (
              <p className="text-xs text-destructive font-medium">
                Spouse income is required for married filing jointly. Enter $0 if your spouse has no income.
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // Marginal rate percentage for retirement savings display
  const marginalPct = useMemo(() => {
    const taxable = Math.max(0, (annualReliefIncome || 0) - (annualBusinessExpenses || 0));
    return Math.round(getV1MarginalRate(taxable, filingStatus) * 100);
  }, [annualReliefIncome, annualBusinessExpenses, filingStatus]);

  function renderRetirementStep() {

    return (
      <div className="space-y-4">
        <Label className="text-base font-medium">Retirement contributions this year</Label>
        <p className="text-sm text-muted-foreground">Are you contributing to a retirement account?</p>
        <div className="space-y-1">
          <Input
            type="number"
            value={skipRetirement ? '' : (retirementContributions || '')}
            onChange={e => { setRetirementContributions(Number(e.target.value)); setSkipRetirement(false); }}
            placeholder="Total planned for this year"
            disabled={skipRetirement}
          />
          <p className="text-xs text-muted-foreground"><TaxTerm term="retirement_sep">SEP-IRA</TaxTerm>, <TaxTerm term="retirement_solo401k">Solo 401(k)</TaxTerm>, SIMPLE IRA — combined</p>
        </div>

        {retirementContributions > 0 && !skipRetirement && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
            <p className="text-sm text-foreground">
              At your income level, every $10,000 contributed saves approximately{' '}
              <strong className="text-emerald-500">${(marginalPct * 100).toLocaleString()}</strong> in federal tax.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Your ${retirementContributions.toLocaleString()} contribution saves ≈ ${retirementSavings.toLocaleString()}
            </p>
          </div>
        )}

        <Alert className="border-muted bg-muted/30">
          <Info className="h-4 w-4 text-muted-foreground" />
          <AlertDescription className="text-xs text-muted-foreground">
            <TaxTerm term="retirement_sep">SEP-IRA</TaxTerm> max: 25% of net income up to $70,000. <TaxTerm term="retirement_solo401k">Solo 401(k)</TaxTerm> max: $23,500 employee + 25% employer up to $70,000.
          </AlertDescription>
        </Alert>

        <button
          className="text-sm text-primary hover:underline"
          onClick={() => { setSkipRetirement(true); setRetirementContributions(0); }}
        >
          Skip for now — I'll add this later
        </button>
      </div>
    );
  }

  const totalNonResidentPct = workStates.reduce((s, w) => s + (Number(w.income_pct) || 0), 0);
  const allocationOver100 = totalNonResidentPct > 100;

  function updateWorkState(idx: number, patch: Partial<WorkStateAllocation>) {
    setWorkStates(prev => prev.map((w, i) => i === idx ? { ...w, ...patch } : w));
  }
  function addWorkState() {
    if (workStates.length >= 4) return;
    setWorkStates(prev => [...prev, { state_code: '', income_pct: 0 }]);
  }
  function removeWorkState(idx: number) {
    setWorkStates(prev => prev.filter((_, i) => i !== idx));
  }

  function renderStateStep() {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <Label className="text-base font-medium">Where do you file taxes?</Label>
          <p className="text-xs text-muted-foreground">Your resident state — where you live and file your primary return.</p>
        </div>
        <Select value={stateCode} onValueChange={setStateCode}>
          <SelectTrigger><SelectValue placeholder="Select your resident state…" /></SelectTrigger>
          <SelectContent className="max-h-64">
            {V1_US_STATES.map(s => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {stateInfo && (
          <div className="rounded-lg bg-muted/50 border p-3">
            <p className="text-sm font-medium">{stateInfo.label}</p>
            {stateInfo.estimated > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Estimated state tax: ${stateInfo.estimated.toLocaleString()}
              </p>
            )}
            {stateInfo.estimated === 0 && TAX_CONSTANTS.states[stateCode]?.type === 'none' && (
              <p className="text-xs text-muted-foreground mt-1">→ $0 state tax on your estimate</p>
            )}
          </div>
        )}

        {/* ── Multi-state toggle ── */}
        <div className="rounded-lg border p-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label className="text-sm font-medium">I also work in other states</Label>
              <p className="text-xs text-muted-foreground">Add states where you do relief shifts but don't live.</p>
            </div>
            <Switch
              checked={multiStateOn}
              onCheckedChange={(v) => {
                setMultiStateOn(v);
                if (!v) setWorkStates([]);
                else if (workStates.length === 0) addWorkState();
              }}
            />
          </div>

          {multiStateOn && (
            <div className="space-y-2 pt-1">
              {workStates.map((w, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Select value={w.state_code} onValueChange={(v) => updateWorkState(idx, { state_code: v })}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="State…" /></SelectTrigger>
                    <SelectContent className="max-h-64">
                      {V1_US_STATES.filter(s => s.code !== stateCode).map(s => (
                        <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="relative w-32">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={w.income_pct || ''}
                      onChange={(e) => updateWorkState(idx, { income_pct: Number(e.target.value) })}
                      placeholder="% income"
                      className="pr-7"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeWorkState(idx)} className="h-9 w-9 shrink-0">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {workStates.length < 4 && (
                <Button variant="outline" size="sm" onClick={addWorkState} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Add another state
                </Button>
              )}

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-muted-foreground">
                  Non-resident allocation: <strong className={allocationOver100 ? 'text-destructive' : 'text-foreground'}>{totalNonResidentPct}%</strong>
                  {' '}· Resident ({stateCode || '—'}): <strong className="text-foreground">{Math.max(0, 100 - totalNonResidentPct)}%</strong>
                </span>
              </div>
              {allocationOver100 && (
                <p className="text-xs text-destructive">Total non-resident percentage can't exceed 100%.</p>
              )}

              <Alert className="border-muted bg-muted/30">
                <Info className="h-4 w-4 text-muted-foreground" />
                <AlertDescription className="text-xs text-muted-foreground">
                  Multi-state estimates use the income split you provide. Your resident state taxes all income but credits taxes paid to non-resident states. For complex situations (residency changes, reciprocal states), confirm with your CPA.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderWithholdingStep() {
    return (
      <div className="space-y-4">
        <Label className="text-base font-medium">Your payroll withholding</Label>
        <p className="text-sm text-muted-foreground">
          When your S-Corp runs payroll, federal and state income tax is withheld from your salary — just like any W-2 employee. This reduces what you owe on your <TaxTerm term="quarterly_payment">quarterly 1040-ES</TaxTerm>.
        </p>
        <div className="space-y-1">
          <Label className="text-sm">Do you withhold <TaxTerm term="extra_withholding">extra federal tax</TaxTerm> from your paycheck to cover your distribution income?</Label>
          <RadioGroup value={hasExtraWithholding ? 'yes' : 'no'} onValueChange={v => { setHasExtraWithholding(v === 'yes'); if (v === 'no') setExtraWithholding(0); }}>
            <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer">
              <RadioGroupItem value="no" id="wh-no" />
              <Label htmlFor="wh-no" className="cursor-pointer flex-1">No — standard withholding only</Label>
            </div>
            <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer">
              <RadioGroupItem value="yes" id="wh-yes" />
              <Label htmlFor="wh-yes" className="cursor-pointer flex-1">Yes — I withhold extra each paycheck</Label>
            </div>
          </RadioGroup>
        </div>
        {hasExtraWithholding && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-sm">Extra amount per paycheck ($)</Label>
              <Input type="number" value={extraWithholding || ''} onChange={e => setExtraWithholding(Number(e.target.value))} placeholder="e.g., 500" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Pay periods per year</Label>
              <Select value={String(payPeriodsPerYear)} onValueChange={v => setPayPeriodsPerYear(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">12 (Monthly)</SelectItem>
                  <SelectItem value="24">24 (Bimonthly)</SelectItem>
                  <SelectItem value="26">26 (Biweekly)</SelectItem>
                  <SelectItem value="52">52 (Weekly)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        <Alert className="border-muted bg-muted/30">
          <Info className="h-4 w-4 text-muted-foreground" />
          <AlertDescription className="text-xs text-muted-foreground">
            Many S-Corp owners skip <TaxTerm term="quarterly_payment">quarterly payments</TaxTerm> entirely by over-withholding on salary. Your CPA can advise whether this makes sense for you.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  function renderCompleteStep() {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-[hsl(var(--chip-success-bg))] flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-[hsl(var(--chip-success-text))]" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Your Tax Profile is {existingProfile ? 'Updated' : 'Ready'}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            We'll now show your quarterly tax estimate. You can update your profile any time.
          </p>
        </div>
      </div>
    );
  }

  const isLastStep = currentStepName === 'complete';

  const canProceed = () => {
    if (currentStepName === 'income') return (annualReliefIncome || 0) > 0;
    if (currentStepName === 'state') {
      if (stateCode === '') return false;
      if (allocationOver100) return false;
      // Every added work-state row must have a state selected (no duplicates handled by filter)
      if (multiStateOn && workStates.some(w => !w.state_code)) return false;
      return true;
    }
    if (currentStepName === 'filing') return true;
    return true;
  };

  function handleNext() {
    // MFJ validation
    if (currentStepName === 'filing' && filingStatus === 'mfj') {
      const input = document.querySelector<HTMLInputElement>('[placeholder="e.g., 65000"]');
      if (input && input.value === '') {
        setMfjSpouseError(true);
        return;
      }
    }
    setStep(step + 1);
  }

  // Map filing status back to DB format
  const dbFilingStatus = filingStatus === 'mfj' ? 'married_joint' : filingStatus === 'hoh' ? 'head_of_household' : 'single';

  async function handleComplete() {
    setSaving(true);
    // Sanitize work_states: drop empties / resident duplicates / zero%
    const cleanWorkStates = multiStateOn
      ? workStates
          .filter(w => w.state_code && w.state_code !== stateCode && (Number(w.income_pct) || 0) > 0)
          .map(w => ({ state_code: w.state_code, income_pct: Math.max(0, Math.min(100, Number(w.income_pct) || 0)) }))
      : [];
    await onSave({
      entity_type: entityType,
      filing_status: dbFilingStatus,
      state_code: stateCode,
      spouse_w2_income: filingStatus === 'mfj' ? spouseW2Income : 0,
      retirement_contribution: retirementContributions,
      scorp_salary: isScorp ? scorpSalary : 0,
      annual_relief_income: annualReliefIncome,
      annual_business_expenses: annualBusinessExpenses,
      extra_withholding: isScorp ? extraWithholding : 0,
      pay_periods_per_year: isScorp ? payPeriodsPerYear : 24,
      work_states: cleanWorkStates,
      setup_completed_at: new Date().toISOString(),
    } as any);
    setSaving(false);
    toast.success(existingProfile ? 'Tax profile updated' : 'Tax profile created');
    onOpenChange(false);
    setStep(1);
  }

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
            <Button onClick={handleNext} disabled={!canProceed()} size="sm">
              Next
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
