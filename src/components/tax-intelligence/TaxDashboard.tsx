import { useMemo, useState, useCallback } from 'react';
import { useData } from '@/contexts/DataContext';
import { useTaxPaymentLogs } from '@/hooks/useTaxPaymentLogs';
import TaxPaymentHub from './TaxPaymentHub';
import TaxPaymentHistory from './TaxPaymentHistory';
import { useExpenses } from '@/hooks/useExpenses';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  CalendarDays, ChevronDown, DollarSign, Calculator, Settings2,
  AlertTriangle, Clock, CheckCircle2, TrendingUp, Info,
} from 'lucide-react';
import IncomeSplitBar from './IncomeSplitBar';
import WhatIfSlider from './WhatIfSlider';
import type { TaxIntelligenceProfile } from '@/hooks/useTaxIntelligence';
import {
  STANDARD_DEDUCTIONS, SS_WAGE_CAP, SE_TAXABLE_FACTOR,
  FILING_STATUS_LABELS, FICA_RATE,
  getQuarterlyDueDates, TAX_YEAR, TAX_YEAR_CONFIG,
  applyFederalBrackets, getMarginalRate,
  type FilingStatus,
} from '@/lib/taxConstants2026';
import { applyStateBrackets, getStateInfo, STATE_TAX_DATA } from '@/lib/stateTaxData';

interface Props {
  profile: TaxIntelligenceProfile;
  onEditProfile: () => void;
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function round2(n: number) { return Math.round(n * 100) / 100; }

// ── Core Calculation Engine ─────────────────────────────────
export interface FullTaxResult {
  grossIncome: number;
  expenses: number;
  netIncome: number;
  seTax: number;
  seDeduction: number;
  federalTax: number;
  stateTax: number;
  personalStateTax: number;
  totalAnnualTax: number;
  quarterlyPayment: number;
  effectiveRate: number;
  marginalRate: number;
  federalTaxableIncome: number;
  agi: number;
  // S-Corp specifics
  distribution?: number;
  employerPayrollTax?: number;
  salary?: number;
  scorpPTEPayment?: number;
  scorpPTEQuarterly?: number;
}

export function calculateTax(
  grossIncome: number,
  profile: TaxIntelligenceProfile,
  expenseOverride?: number,
): FullTaxResult {
  const fs = (profile.filing_status || 'single') as FilingStatus;
  const expenses = expenseOverride ?? (profile.ytd_expenses_estimate || 0);
  const retirementContrib = profile.retirement_contribution || 0;
  const spouseW2 = profile.spouse_w2_income || 0;
  const spouseSE = profile.spouse_has_se_income ? (profile.spouse_se_net_income || 0) : 0;
  const standardDed = STANDARD_DEDUCTIONS[fs] || STANDARD_DEDUCTIONS.single;

  if (profile.entity_type === 'scorp') {
    const salary = profile.scorp_salary || 0;
    const netIncome = Math.max(0, grossIncome - expenses);
    const employerPayrollTax = round2(salary * FICA_RATE);
    let distribution = Math.max(0, netIncome - salary - employerPayrollTax);

    // PTE tax (entity-level state payment)
    const stateData = STATE_TAX_DATA[profile.state_code];
    const pteElected = profile.pte_elected && stateData?.hasPTE;
    let scorpPTEPayment = 0;
    if (pteElected && stateData?.pteRate) {
      scorpPTEPayment = round2(distribution * stateData.pteRate);
      distribution = Math.max(0, distribution - scorpPTEPayment);
    }

    const agi = Math.max(0, salary + distribution - retirementContrib + spouseW2 + spouseSE);
    const taxableIncome = Math.max(0, agi - standardDed);
    const federalTax = applyFederalBrackets(taxableIncome, fs);
    const marginalRate = getMarginalRate(taxableIncome, fs);

    // State tax: 0 if PTE elected (handled at entity level)
    const personalStateTax = applyStateBrackets(
      salary + distribution, profile.filing_status, profile.state_code, !!pteElected,
    );

    // Quarterly: federal + state only, NO payroll tax
    const totalAnnualTax = round2(federalTax + personalStateTax);
    const quarterlyPayment = round2(totalAnnualTax / 4);

    return {
      grossIncome, expenses, netIncome,
      seTax: 0, seDeduction: 0,
      federalTax, stateTax: personalStateTax, personalStateTax,
      totalAnnualTax, quarterlyPayment,
      effectiveRate: grossIncome > 0 ? round2((totalAnnualTax / grossIncome) * 100) : 0,
      marginalRate, federalTaxableIncome: taxableIncome, agi,
      distribution, employerPayrollTax, salary,
      scorpPTEPayment: pteElected ? scorpPTEPayment : undefined,
      scorpPTEQuarterly: pteElected ? round2(scorpPTEPayment / 4) : undefined,
    };
  }

  // 1099 / Sole Prop path
  const netIncome = Math.max(0, grossIncome - expenses);
  const seBase = netIncome * SE_TAXABLE_FACTOR;
  const ssBase = Math.min(seBase, SS_WAGE_CAP);
  const medicareThreshold = TAX_YEAR_CONFIG.additionalMedicareThreshold[fs] ?? 200000;
  const additionalMedicare = Math.max(0, seBase - medicareThreshold) * TAX_YEAR_CONFIG.additionalMedicareRate;
  const seTax = round2(ssBase * 0.124 + seBase * 0.029 + additionalMedicare);
  const seDeduction = round2(seTax / 2);
  const agi = Math.max(0, netIncome - seDeduction - retirementContrib + spouseW2 + spouseSE);
  const taxableIncome = Math.max(0, agi - standardDed);
  const federalTax = applyFederalBrackets(taxableIncome, fs);
  const marginalRate = getMarginalRate(taxableIncome, fs);
  const personalStateTax = applyStateBrackets(netIncome, profile.filing_status, profile.state_code);
  const totalAnnualTax = round2(seTax + federalTax + personalStateTax);

  return {
    grossIncome, expenses, netIncome,
    seTax, seDeduction, federalTax,
    stateTax: personalStateTax, personalStateTax,
    totalAnnualTax,
    quarterlyPayment: round2(totalAnnualTax / 4),
    effectiveRate: grossIncome > 0 ? round2((totalAnnualTax / grossIncome) * 100) : 0,
    marginalRate, federalTaxableIncome: taxableIncome, agi,
  };
}

// ── Bracket Visualization ─────────────────────────────────
function BracketVisualization({ taxableIncome, fs, marginalRate }: { taxableIncome: number; fs: FilingStatus; marginalRate: number }) {
  const bracketLabels = ['10%', '12%', '22%', '24%', '32%', '35%', '37%'];
  const bracketRates = [0.10, 0.12, 0.22, 0.24, 0.32, 0.35, 0.37];
  const bracketColors = [
    'bg-emerald-200 dark:bg-emerald-800',
    'bg-emerald-300 dark:bg-emerald-700',
    'bg-yellow-200 dark:bg-yellow-700',
    'bg-yellow-300 dark:bg-yellow-600',
    'bg-orange-300 dark:bg-orange-600',
    'bg-red-300 dark:bg-red-600',
    'bg-red-400 dark:bg-red-500',
  ];

  const marginalPct = Math.round(marginalRate * 100);
  const addlTaxPer1k = Math.round(marginalRate * 1000);

  // Find which bracket the user is in
  const currentBracketIdx = bracketRates.findIndex(r => r === marginalRate);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 overflow-hidden rounded-md h-5">
        {bracketLabels.map((label, i) => (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <div
                className={`h-full flex-1 ${bracketColors[i]} ${i <= currentBracketIdx ? 'opacity-100' : 'opacity-30'} transition-opacity relative`}
              >
                {i === currentBracketIdx && (
                  <div className="absolute inset-0 ring-2 ring-primary rounded-sm" />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent className="text-xs">{label} bracket</TooltipContent>
          </Tooltip>
        ))}
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">You are in the <strong className="text-foreground">{marginalPct}% bracket</strong></span>
        <span className="text-muted-foreground font-medium">Every additional $1,000 adds <strong className="text-amber-500">${addlTaxPer1k}</strong> in federal tax</span>
      </div>
    </div>
  );
}

export default function TaxDashboard({ profile, onEditProfile }: Props) {
  const { shifts, invoices } = useData();
  const { ytdDeductibleCents } = useExpenses();
  const now = new Date();
  const currentYear = now.getFullYear();
  const paymentLogs = useTaxPaymentLogs(currentYear);
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);
  const dueDates = getQuarterlyDueDates(currentYear);
  const fs = (profile.filing_status || 'single') as FilingStatus;

  const earnedIncome = useMemo(() => {
    return invoices
      .filter(inv => inv.status === 'paid' && inv.paid_at && new Date(inv.paid_at).getFullYear() === currentYear)
      .reduce((sum, inv) => sum + inv.total_amount, 0);
  }, [invoices, currentYear]);

  const projectedIncome = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 90);
    return shifts
      .filter(s => {
        const d = new Date(s.start_datetime);
        return d >= now && d <= cutoff;
      })
      .reduce((sum, s) => sum + (s.rate_applied || 0), 0);
  }, [shifts, now]);

  const totalIncome = earnedIncome + projectedIncome;
  const actualExpenses = ytdDeductibleCents / 100;
  const blendedExpenses = Math.max(actualExpenses, profile.ytd_expenses_estimate || 0);

  const taxResult = useMemo(() => calculateTax(totalIncome, profile, blendedExpenses), [totalIncome, profile, blendedExpenses]);

  const whatIfCalculator = useCallback((additionalIncome: number) => {
    const result = calculateTax(totalIncome + additionalIncome, profile, blendedExpenses);
    return result.quarterlyPayment;
  }, [totalIncome, profile, blendedExpenses]);

  const nextDue = useMemo(() => {
    for (let q = 1; q <= 4; q++) {
      const d = new Date(dueDates[q].due);
      if (d >= now) return { quarter: q, ...dueDates[q], daysUntil: Math.ceil((d.getTime() - now.getTime()) / 86400000) };
    }
    return null;
  }, [dueDates, now]);

  const recommendedPct = taxResult.effectiveRate > 0 ? Math.ceil(taxResult.effectiveRate) : 25;
  const perThousand = round2((recommendedPct / 100) * 1000);

  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const isScorp = profile.entity_type === 'scorp';
  const hasPTE = !!(taxResult.scorpPTEPayment !== undefined && taxResult.scorpPTEPayment > 0);
  const stateInfo = getStateInfo(profile.state_code);

  return (
    <div className="space-y-5">
      {/* ═══ HERO CARD ═══ */}
      <Card className="overflow-hidden border-primary/20">
        <div className="bg-gradient-to-br from-primary/5 via-primary/3 to-transparent p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                {currentYear} Tax Intelligence
                {isScorp && (
                  <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary border-primary/20">S-Corp</Badge>
                )}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Filing as {FILING_STATUS_LABELS[fs] || 'Single'}
                {profile.state_code ? ` · ${profile.state_code}` : ''}
                {isScorp ? ' · S-Corp' : ' · 1099'}
                {hasPTE && ' · PTE Elected'}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onEditProfile} className="text-xs gap-1">
              <Settings2 className="h-3.5 w-3.5" /> Edit Profile
            </Button>
          </div>

          {/* Quarterly Payment Hero — split for PTE */}
          {nextDue && !hasPTE && (
            <div className="rounded-xl bg-background/80 backdrop-blur-sm border p-5 mb-4 text-center">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Next Quarterly Payment · {nextDue.label}
              </p>
              <p className="text-4xl font-bold text-amber-500">${fmt(taxResult.quarterlyPayment)}</p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Due {nextDue.due}</span>
                <Badge variant={nextDue.daysUntil <= 14 ? 'destructive' : 'secondary'} className="text-[10px]">
                  <Clock className="h-3 w-3 mr-0.5" />
                  {nextDue.daysUntil} days
                </Badge>
              </div>
            </div>
          )}

          {/* PTE Split Cards */}
          {nextDue && hasPTE && (
            <>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="rounded-xl bg-background/80 backdrop-blur-sm border p-4 text-center">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Your 1040-ES Payment</p>
                  <p className="text-[10px] text-muted-foreground">(federal income tax)</p>
                  <p className="text-2xl font-bold text-amber-500 mt-1">${fmt(taxResult.quarterlyPayment)}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">per quarter</p>
                  <p className="text-[10px] text-muted-foreground">Pay via IRS Direct Pay or EFTPS</p>
                </div>
                <div className="rounded-xl bg-background/80 backdrop-blur-sm border p-4 text-center">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">S-Corp PTE Payment</p>
                  <p className="text-[10px] text-muted-foreground">(state, entity-level)</p>
                  <p className="text-2xl font-bold text-amber-500 mt-1">${fmt(taxResult.scorpPTEQuarterly || 0)}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">per quarter</p>
                  <p className="text-[10px] text-muted-foreground">Paid by your S-Corp through state e-file</p>
                </div>
              </div>
              <div className="text-center mb-4">
                <p className="text-sm text-muted-foreground">
                  Combined quarterly obligation: <strong className="text-foreground">${fmt(taxResult.quarterlyPayment + (taxResult.scorpPTEQuarterly || 0))}</strong>
                </p>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Due {nextDue.due}</span>
                  <Badge variant={nextDue.daysUntil <= 14 ? 'destructive' : 'secondary'} className="text-[10px]">
                    <Clock className="h-3 w-3 mr-0.5" />
                    {nextDue.daysUntil} days
                  </Badge>
                </div>
              </div>
              <Alert className="border-muted bg-muted/30 mb-4">
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                <AlertDescription className="text-xs text-muted-foreground">
                  Your S-Corp's PTE payment is deducted as a business expense, reducing your K-1 distribution and federal taxable income. Your 1040-ES covers only the remaining federal income tax.
                </AlertDescription>
              </Alert>
            </>
          )}

          {/* KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl bg-background/80 backdrop-blur-sm border p-3">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Income</p>
              <p className="text-xl font-bold mt-1">${fmt(totalIncome)}</p>
              <p className="text-[10px] text-muted-foreground">earned + projected</p>
            </div>
            <div className="rounded-xl bg-background/80 backdrop-blur-sm border p-3">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {isScorp ? 'Federal Tax' : 'SE Tax'}
              </p>
              <p className="text-xl font-bold text-amber-500 mt-1">${fmt(isScorp ? taxResult.federalTax : taxResult.seTax)}</p>
            </div>
            <div className="rounded-xl bg-background/80 backdrop-blur-sm border p-3">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {isScorp ? 'State Tax' : 'Federal Tax'}
              </p>
              <p className="text-xl font-bold text-amber-500 mt-1">${fmt(isScorp ? taxResult.personalStateTax : taxResult.federalTax)}</p>
            </div>
            <div className="rounded-xl bg-background/80 backdrop-blur-sm border p-3">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Annual</p>
              <p className="text-xl font-bold text-amber-500 mt-1">${fmt(taxResult.totalAnnualTax)}</p>
              <p className="text-[10px] text-muted-foreground">{taxResult.effectiveRate}% effective</p>
            </div>
          </div>
        </div>
      </Card>

      {/* ═══ TAX PAYMENT HUB ═══ */}
      <TaxPaymentHub
        profile={profile}
        taxResult={taxResult}
        nextDue={nextDue}
        paymentLogs={paymentLogs}
      />

      {/* ═══ BRACKET VISUALIZATION ═══ */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Federal Tax Bracket</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-3 gap-x-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Household AGI</p>
              <p className="font-medium">${fmt(taxResult.agi)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Standard Deduction</p>
              <p className="font-medium">−${fmt(STANDARD_DEDUCTIONS[fs])}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Federal Taxable</p>
              <p className="font-medium">${fmt(taxResult.federalTaxableIncome)}</p>
            </div>
          </div>
          <BracketVisualization
            taxableIncome={taxResult.federalTaxableIncome}
            fs={fs}
            marginalRate={taxResult.marginalRate}
          />
        </CardContent>
      </Card>

      {/* ═══ INCOME SPLIT BAR ═══ */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Income Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <IncomeSplitBar earned={earnedIncome} projected={projectedIncome} />
        </CardContent>
      </Card>

      {/* ═══ QUARTERLY TIMELINE ═══ */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Quarterly Payment Timeline</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(q => {
            const dd = dueDates[q];
            const isPast = new Date(dd.due) < now;
            const isCurrent = q === currentQuarter;
            return (
              <Card key={q} className={`${isCurrent ? 'border-primary ring-1 ring-primary/20' : ''}`}>
                <CardContent className="p-3 text-center">
                  <p className="text-xs font-medium text-muted-foreground">{dd.label}</p>
                  <p className="text-xs text-muted-foreground">{dd.months}</p>
                  <p className="text-lg font-bold mt-1">${fmt(taxResult.quarterlyPayment)}</p>
                  {hasPTE && (
                    <p className="text-[10px] text-muted-foreground">+ ${fmt(taxResult.scorpPTEQuarterly || 0)} PTE</p>
                  )}
                  <p className="text-[11px] text-muted-foreground">Due {dd.due}</p>
                  {isCurrent && <Badge className="mt-1 text-[10px]">Current</Badge>}
                  {isPast && !isCurrent && (
                    <Badge variant="secondary" className="mt-1 text-[10px]">
                      <CheckCircle2 className="h-3 w-3 mr-0.5" /> Past
                    </Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ═══ TAX BREAKDOWN ACCORDION ═══ */}
      <Collapsible open={breakdownOpen} onOpenChange={setBreakdownOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 group">
          <DollarSign className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold flex-1">Tax Breakdown Detail</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-2">
            <CardContent className="pt-4 space-y-2">
              <Row label="Gross Income" value={taxResult.grossIncome} />
              <Row label={`Business Expenses${actualExpenses > (profile.ytd_expenses_estimate || 0) ? ' (actual)' : ' (estimated)'}`} value={-taxResult.expenses} />
              <Row label="Net Income" value={taxResult.netIncome} bold />
              <div className="border-t my-2" />
              {isScorp ? (
                <>
                  <Row label="W-2 Salary" value={taxResult.salary || 0} />
                  <Row label="Distribution" value={taxResult.distribution || 0} />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex justify-between text-sm text-muted-foreground cursor-help">
                        <span>Employer payroll taxes (auto-calculated · 7.65% of salary)</span>
                        <span>${fmt(taxResult.employerPayrollTax || 0)}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs max-w-xs">
                      Payroll taxes on your W-2 salary are paid through your payroll system and are not included in your quarterly 1040-ES estimate.
                    </TooltipContent>
                  </Tooltip>
                  {hasPTE && (
                    <Row label={`PTE Tax (${profile.state_code})`} value={taxResult.scorpPTEPayment || 0} negative />
                  )}
                </>
              ) : (
                <>
                  <Row label="SE Tax (15.3%)" value={taxResult.seTax} negative />
                  <Row label="SE Tax Deduction (½)" value={-taxResult.seDeduction} />
                </>
              )}
              {profile.retirement_contribution > 0 && (
                <Row label="Retirement Contribution" value={-profile.retirement_contribution} />
              )}
              {(profile.spouse_w2_income > 0 || profile.other_w2_income > 0) && (
                <Row label="Household W-2 Income" value={(profile.spouse_w2_income || 0) + (profile.other_w2_income || 0)} />
              )}
              {profile.spouse_has_se_income && profile.spouse_se_net_income > 0 && (
                <Row label="Spouse SE Income" value={profile.spouse_se_net_income} />
              )}
              <div className="border-t my-2" />
              <Row label="Federal Income Tax" value={taxResult.federalTax} negative />
              <Row label={`State Tax (${profile.state_code || 'N/A'})${hasPTE ? ' (PTE — entity-level)' : ''}`} value={taxResult.personalStateTax} negative />
              <div className="border-t my-2" />
              <Row label="Total Annual Tax (personal)" value={taxResult.totalAnnualTax} bold negative />
              <Row label="Effective Rate" valueStr={`${taxResult.effectiveRate}%`} />
              <Row label="Marginal Rate" valueStr={`${Math.round(taxResult.marginalRate * 100)}%`} />
              <Row label="Quarterly 1040-ES Payment" value={taxResult.quarterlyPayment} bold negative />
              {hasPTE && (
                <Row label="Quarterly PTE Payment (S-Corp)" value={taxResult.scorpPTEQuarterly || 0} bold negative />
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* ═══ WHAT-IF SLIDER ═══ */}
      <WhatIfSlider
        currentQuarterlyPayment={taxResult.quarterlyPayment}
        onIncomeChange={whatIfCalculator}
      />

      {/* ═══ SAVE-AS-YOU-GO NUDGE ═══ */}
      <Alert className="border-[hsl(var(--info))] bg-[hsl(var(--chip-info-bg))]">
        <DollarSign className="h-4 w-4 text-[hsl(var(--chip-info-text))]" />
        <AlertDescription className="text-sm text-[hsl(var(--chip-info-text))]">
          <strong>Set aside {recommendedPct}%</strong> of each payment to cover taxes. That's <strong>${fmt(perThousand)} per $1,000 earned</strong>.
        </AlertDescription>
      </Alert>

      {/* ═══ PAYMENT HISTORY ═══ */}
      <TaxPaymentHistory payments={paymentLogs.payments} />

      {/* Tax data version footer + Disclaimer */}
      <div className="space-y-1">
        <p className="text-[11px] text-muted-foreground text-center">
          Estimates based on {TAX_YEAR_CONFIG.activeYear} federal brackets{profile.state_code ? ` and ${profile.state_code} ${TAX_YEAR_CONFIG.activeYear} rates` : ''}
          {' · '}Last updated: {TAX_YEAR_CONFIG.lastUpdated} · Rates updated annually each January
        </p>
        <p className="text-[11px] text-muted-foreground text-center">
          <AlertTriangle className="h-3 w-3 inline mr-1" />
          Estimates use {TAX_YEAR_CONFIG.activeYear} federal brackets{profile.state_code ? `, ${profile.state_code} progressive rates` : ''}, and inputs from your tax profile. Does not account for QBI deduction, AMT, itemized deductions, or tax credits. Use this to plan and save — not to file.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, valueStr, bold, negative }: { label: string; value?: number; valueStr?: string; bold?: boolean; negative?: boolean }) {
  const display = valueStr || (value !== undefined ? `${value < 0 ? '-' : ''}$${fmt(Math.abs(value))}` : '');
  return (
    <div className={`flex justify-between text-sm ${bold ? 'font-semibold' : ''}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className={negative && (value ?? 0) > 0 ? 'text-amber-500' : ''}>{display}</span>
    </div>
  );
}
