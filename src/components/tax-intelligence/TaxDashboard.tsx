import { useMemo, useState, useCallback } from 'react';
import { useData } from '@/contexts/DataContext';
import { useExpenses } from '@/hooks/useExpenses';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CalendarDays, ChevronDown, DollarSign, Calculator, Settings2,
  AlertTriangle, Clock, CheckCircle2, TrendingUp,
} from 'lucide-react';
import IncomeSplitBar from './IncomeSplitBar';
import WhatIfSlider from './WhatIfSlider';
import type { TaxIntelligenceProfile } from '@/hooks/useTaxIntelligence';
import {
  STANDARD_DEDUCTIONS, BRACKETS, SS_WAGE_CAP, SE_TAXABLE_FACTOR,
  STATE_TAX_RATES, FILING_STATUS_LABELS, FICA_RATE,
  getQuarterlyDueDates, TAX_YEAR,
  type FilingStatus,
} from '@/lib/taxConstants2026';

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
  totalAnnualTax: number;
  quarterlyPayment: number;
  effectiveRate: number;
  // S-Corp specifics
  distribution?: number;
  payrollTax?: number;
  salary?: number;
}

function computeFederalTax(taxableIncome: number, filingStatus: FilingStatus): number {
  const brackets = BRACKETS[filingStatus] || BRACKETS.single;
  let tax = 0, prev = 0;
  for (const { limit, rate } of brackets) {
    if (taxableIncome <= prev) break;
    tax += (Math.min(taxableIncome, limit) - prev) * rate;
    prev = limit;
  }
  return round2(tax);
}

export function calculateTax(
  grossIncome: number,
  profile: TaxIntelligenceProfile,
  expenseOverride?: number,
): FullTaxResult {
  const fs = (profile.filing_status || 'single') as FilingStatus;
  const expenses = expenseOverride ?? (profile.ytd_expenses_estimate || 0);
  const stateRate = STATE_TAX_RATES[profile.state_code] || 0;
  const otherIncome = profile.other_w2_income || 0;
  const retirementContrib = profile.retirement_contribution || 0;

  if (profile.entity_type === 'scorp') {
    const salary = profile.scorp_salary || 0;
    const netIncome = Math.max(0, grossIncome - expenses);
    const distribution = Math.max(0, netIncome - salary);
    const payrollTax = round2(salary * FICA_RATE * 2);
    const agi = salary + distribution - retirementContrib + otherIncome;
    const standardDed = STANDARD_DEDUCTIONS[fs] || STANDARD_DEDUCTIONS.single;
    const taxableIncome = Math.max(0, agi - standardDed);
    const federalTax = computeFederalTax(taxableIncome, fs);
    const stateTax = round2((salary + distribution) * stateRate);
    const totalAnnualTax = round2(payrollTax + federalTax + stateTax);
    return {
      grossIncome, expenses, netIncome,
      seTax: payrollTax, seDeduction: 0,
      federalTax, stateTax, totalAnnualTax,
      quarterlyPayment: round2(totalAnnualTax / 4),
      effectiveRate: grossIncome > 0 ? round2((totalAnnualTax / grossIncome) * 100) : 0,
      distribution, payrollTax, salary,
    };
  }

  // 1099 / Sole Prop path
  const netIncome = Math.max(0, grossIncome - expenses);
  const seBase = netIncome * SE_TAXABLE_FACTOR;
  const ssBase = Math.min(seBase, SS_WAGE_CAP);
  const seTax = round2(ssBase * 0.124 + seBase * 0.029);
  const seDeduction = round2(seTax / 2);
  const agi = netIncome - seDeduction - retirementContrib + otherIncome;
  const standardDed = STANDARD_DEDUCTIONS[fs] || STANDARD_DEDUCTIONS.single;
  const taxableIncome = Math.max(0, agi - standardDed);
  const federalTax = computeFederalTax(taxableIncome, fs);
  const stateTax = round2(netIncome * stateRate);
  const totalAnnualTax = round2(seTax + federalTax + stateTax);

  return {
    grossIncome, expenses, netIncome,
    seTax, seDeduction, federalTax, stateTax,
    totalAnnualTax,
    quarterlyPayment: round2(totalAnnualTax / 4),
    effectiveRate: grossIncome > 0 ? round2((totalAnnualTax / grossIncome) * 100) : 0,
  };
}

export default function TaxDashboard({ profile, onEditProfile }: Props) {
  const { shifts, invoices } = useData();
  const { ytdDeductibleCents } = useExpenses();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);
  const dueDates = getQuarterlyDueDates(currentYear);

  // Income from paid invoices (YTD)
  const earnedIncome = useMemo(() => {
    return invoices
      .filter(inv => inv.status === 'paid' && inv.paid_at && new Date(inv.paid_at).getFullYear() === currentYear)
      .reduce((sum, inv) => sum + inv.total_amount, 0);
  }, [invoices, currentYear]);

  // Projected income from upcoming shifts (next 90 days)
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

  const taxResult = useMemo(() => calculateTax(totalIncome, profile), [totalIncome, profile]);

  // What-if calculator
  const whatIfCalculator = useCallback((additionalIncome: number) => {
    const result = calculateTax(totalIncome + additionalIncome, profile);
    return result.quarterlyPayment;
  }, [totalIncome, profile]);

  // Next due date
  const nextDue = useMemo(() => {
    for (let q = 1; q <= 4; q++) {
      const d = new Date(dueDates[q].due);
      if (d >= now) return { quarter: q, ...dueDates[q], daysUntil: Math.ceil((d.getTime() - now.getTime()) / 86400000) };
    }
    return null;
  }, [dueDates, now]);

  // Save-as-you-go recommendation
  const recommendedPct = taxResult.effectiveRate > 0 ? Math.ceil(taxResult.effectiveRate) : 25;
  const perThousand = round2((recommendedPct / 100) * 1000);

  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const isScorp = profile.entity_type === 'scorp';

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
                Filing as {FILING_STATUS_LABELS[profile.filing_status as FilingStatus] || 'Single'}
                {profile.state_code ? ` · ${profile.state_code}` : ''}
                {isScorp ? ' · S-Corp' : ' · 1099'}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onEditProfile} className="text-xs gap-1">
              <Settings2 className="h-3.5 w-3.5" /> Edit Profile
            </Button>
          </div>

          {/* Next Quarterly Payment Hero */}
          {nextDue && (
            <div className="rounded-xl bg-background/80 backdrop-blur-sm border p-5 mb-4 text-center">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Next Quarterly Payment · {nextDue.label}
              </p>
              <p className="text-4xl font-bold text-destructive">${fmt(taxResult.quarterlyPayment)}</p>
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

          {/* KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl bg-background/80 backdrop-blur-sm border p-3">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Income</p>
              <p className="text-xl font-bold mt-1">${fmt(totalIncome)}</p>
              <p className="text-[10px] text-muted-foreground">earned + projected</p>
            </div>
            <div className="rounded-xl bg-background/80 backdrop-blur-sm border p-3">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {isScorp ? 'Payroll Tax' : 'SE Tax'}
              </p>
              <p className="text-xl font-bold text-destructive mt-1">${fmt(taxResult.seTax)}</p>
            </div>
            <div className="rounded-xl bg-background/80 backdrop-blur-sm border p-3">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Federal Tax</p>
              <p className="text-xl font-bold text-destructive mt-1">${fmt(taxResult.federalTax)}</p>
            </div>
            <div className="rounded-xl bg-background/80 backdrop-blur-sm border p-3">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Annual</p>
              <p className="text-xl font-bold text-destructive mt-1">${fmt(taxResult.totalAnnualTax)}</p>
              <p className="text-[10px] text-muted-foreground">{taxResult.effectiveRate}% effective</p>
            </div>
          </div>
        </div>
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
              <Row label="Business Expenses" value={-taxResult.expenses} />
              <Row label="Net Income" value={taxResult.netIncome} bold />
              <div className="border-t my-2" />
              {isScorp ? (
                <>
                  <Row label="W-2 Salary" value={taxResult.salary || 0} />
                  <Row label="Distribution" value={taxResult.distribution || 0} />
                  <Row label="Payroll Tax (FICA × 2)" value={taxResult.payrollTax || 0} negative />
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
              {profile.other_w2_income > 0 && (
                <Row label="Other W-2 Income" value={profile.other_w2_income} />
              )}
              <div className="border-t my-2" />
              <Row label="Federal Income Tax" value={taxResult.federalTax} negative />
              <Row label={`State Tax (${profile.state_code || 'N/A'})`} value={taxResult.stateTax} negative />
              <div className="border-t my-2" />
              <Row label="Total Annual Tax" value={taxResult.totalAnnualTax} bold negative />
              <Row label="Effective Rate" valueStr={`${taxResult.effectiveRate}%`} />
              <Row label="Quarterly Payment" value={taxResult.quarterlyPayment} bold negative />
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

      {/* Disclaimer */}
      <p className="text-[11px] text-muted-foreground text-center">
        <AlertTriangle className="h-3 w-3 inline mr-1" />
        This is an estimate for planning purposes only · {currentYear} tax year · Confirm quarterly payments with your tax advisor
      </p>
    </div>
  );
}

function Row({ label, value, valueStr, bold, negative }: { label: string; value?: number; valueStr?: string; bold?: boolean; negative?: boolean }) {
  const display = valueStr || (value !== undefined ? `${value < 0 ? '-' : ''}$${fmt(Math.abs(value))}` : '');
  return (
    <div className={`flex justify-between text-sm ${bold ? 'font-semibold' : ''}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className={negative && (value ?? 0) > 0 ? 'text-destructive' : ''}>{display}</span>
    </div>
  );
}
