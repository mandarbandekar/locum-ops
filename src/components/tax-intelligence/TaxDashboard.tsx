import { useMemo, useState } from 'react';
import { useTaxPaymentLogs } from '@/hooks/useTaxPaymentLogs';
import TaxPaymentHub from './TaxPaymentHub';
import TaxPaymentHistory from './TaxPaymentHistory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  CalendarDays, ChevronDown, DollarSign, Calculator, Settings2,
  Clock, CheckCircle2, Info, CreditCard, TrendingUp, AlertTriangle,
} from 'lucide-react';
import TaxProjectionDisplay, { daysPerWeekToIndex, indexToDaysPerWeek, SCHEDULE_OPTIONS } from './TaxProjectionDisplay';
import EntityComparisonCard from './EntityComparisonCard';
import TaxTerm from './TaxTerm';
import type { TaxIntelligenceProfile } from '@/hooks/useTaxIntelligence';
import { TAX_CONSTANTS, V1_FILING_STATUS_LABELS, V1_DISCLAIMER, getV1QuarterlyDueDates, type V1FilingStatus } from '@/lib/taxConstantsV1';
import { calculateTaxV1, mapDbProfileToV1, type TaxV1Result, type Tax1099Result, type TaxSCorpResult } from '@/lib/taxCalculatorV1';

interface Props {
  profile: TaxIntelligenceProfile;
  onEditProfile: () => void;
  onSaveProfile?: (updates: Partial<TaxIntelligenceProfile>) => void;
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

// Re-export for backward compat with DashboardPage
export function calculateTax(grossIncome: number, profile: TaxIntelligenceProfile) {
  const v1Profile = mapDbProfileToV1({ ...profile, annual_relief_income: grossIncome });
  const result = calculateTaxV1(v1Profile);
  if (!result) return { quarterlyPayment: 0, totalAnnualTax: 0, effectiveRate: 0, marginalRate: 0, seTax: 0, federalTax: 0, personalStateTax: 0, netIncome: 0, federalTaxableIncome: 0, agi: 0, grossIncome: 0, expenses: 0, stateTax: 0, seDeduction: 0 };
  if (result.path === '1099') {
    return { quarterlyPayment: result.quarterlyPayment, totalAnnualTax: result.annualEstimatedTaxDue, effectiveRate: result.effectiveRate, marginalRate: result.marginalRate, seTax: result.totalSeTax, federalTax: result.totalFederalTax, personalStateTax: result.stateTax, netIncome: result.netIncome, federalTaxableIncome: result.federalTaxableIncome, agi: result.agi, grossIncome: result.grossIncome, expenses: result.expenses, stateTax: result.stateTax, seDeduction: result.seDeduction };
  }
  return { quarterlyPayment: result.quarterlyPayment, totalAnnualTax: result.annualEstimatedTaxDue, effectiveRate: result.effectiveRate, marginalRate: result.marginalRate, seTax: 0, federalTax: result.totalFederalTax, personalStateTax: result.stateTax, netIncome: result.grossRevenue - result.operatingExpenses, federalTaxableIncome: result.federalTaxableIncome, agi: result.agi, grossIncome: result.grossRevenue, expenses: result.operatingExpenses, stateTax: result.stateTax, seDeduction: 0, distribution: result.distribution, salary: result.salary };
}

export default function TaxDashboard({ profile, onEditProfile, onSaveProfile }: Props) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const paymentLogs = useTaxPaymentLogs(currentYear);
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);
  const dueDates = getV1QuarterlyDueDates(currentYear);

  const fsKey = profile.filing_status === 'married_joint' ? 'mfj'
    : profile.filing_status === 'head_of_household' ? 'hoh'
    : profile.filing_status === 'mfj' ? 'mfj'
    : profile.filing_status === 'hoh' ? 'hoh'
    : 'single';
  const fsLabel = V1_FILING_STATUS_LABELS[fsKey as V1FilingStatus] || 'Single';

  const v1Profile = useMemo(() => mapDbProfileToV1(profile), [profile]);
  const taxResult = useMemo(() => calculateTaxV1(v1Profile), [v1Profile]);

  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const isScorp = profile.entity_type === 'scorp';
  const is1099 = !isScorp;

  // Schedule selector state for TaxProjectionDisplay
  const savedDays = (profile as any)?.typical_days_per_week;
  const [scheduleIndex, setScheduleIndex] = useState(savedDays ? daysPerWeekToIndex(savedDays) : 1);

  const handleScheduleChange = (index: number) => {
    setScheduleIndex(index);
    const days = indexToDaysPerWeek(index);
    onSaveProfile?.({ typical_days_per_week: days } as any);
  };

  // Derive day rate from annual income and schedule
  const dayRate = useMemo(() => {
    if (profile.annual_relief_income) {
      const schedule = SCHEDULE_OPTIONS[scheduleIndex] ?? SCHEDULE_OPTIONS[1];
      return Math.round(profile.annual_relief_income / schedule.daysPerYear);
    }
    return 650;
  }, [profile.annual_relief_income, scheduleIndex]);

  const nextDue = useMemo(() => {
    for (let q = 1; q <= 4; q++) {
      const d = new Date(dueDates[q].due);
      if (d >= now) return { quarter: q, ...dueDates[q], daysUntil: Math.ceil((d.getTime() - now.getTime()) / 86400000) };
    }
    return null;
  }, [dueDates, now]);


  if (!taxResult) {
    return <p className="text-muted-foreground py-8 text-center">Unable to calculate taxes. Please check your profile.</p>;
  }

  const quarterlyPayment = taxResult.quarterlyPayment;
  const effectiveRate = taxResult.effectiveRate;
  const marginalRate = taxResult.marginalRate;

  return (
    <div className="space-y-5">
      {/* ═══ HERO ═══ */}
      <Card className="overflow-hidden border-primary/20">
        <div className="bg-gradient-to-br from-primary/5 via-primary/3 to-transparent p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Your Quarterly Tax Estimate
                {isScorp && <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary border-primary/20">S-Corp</Badge>}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Filing as {fsLabel} · {profile.state_code || 'No state'} · {isScorp ? 'S-Corp' : '1099'} · {TAX_CONSTANTS.taxYear} rates
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onEditProfile} className="text-xs gap-1">
              <Settings2 className="h-3.5 w-3.5" /> Edit Profile
            </Button>
          </div>

          {nextDue && (
            <div className="rounded-xl bg-background/80 backdrop-blur-sm border p-5 mb-4 text-center">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                {nextDue.label} payment due {nextDue.due}
              </p>
              <p className="text-4xl font-bold text-amber-500">${fmt(quarterlyPayment)}</p>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                {is1099 && taxResult.path === '1099' && (
                  <>
                    <Badge variant="outline" className="text-[11px] gap-1 font-normal">
                      <TaxTerm term="federal_taxable_income">Federal</TaxTerm> ${fmt(Math.round(taxResult.vetFederalShare / 4))}
                    </Badge>
                    <Badge variant="outline" className="text-[11px] gap-1 font-normal">
                      <TaxTerm term="se_tax">SE Tax</TaxTerm> ${fmt(Math.round(taxResult.totalSeTax / 4))}
                    </Badge>
                    {taxResult.stateTax > 0 && (
                      <Badge variant="outline" className="text-[11px] gap-1 font-normal">
                        {profile.state_code || 'State'} ${fmt(Math.round(taxResult.stateTax / 4))}
                      </Badge>
                    )}
                  </>
                )}
                {isScorp && taxResult.path === 'scorp' && (
                  <>
                    <Badge variant="outline" className="text-[11px] gap-1 font-normal">
                      <TaxTerm term="federal_taxable_income">Federal</TaxTerm> ${fmt(Math.round(taxResult.federalOnDistribution / 4))}
                    </Badge>
                    {taxResult.stateOnDistribution > 0 && (
                      <Badge variant="outline" className="text-[11px] gap-1 font-normal">
                        {profile.state_code || 'State'} ${fmt(Math.round(taxResult.stateOnDistribution / 4))}
                      </Badge>
                    )}
                  </>
                )}
              </div>
              {isScorp && (
                <p className="text-xs text-muted-foreground mt-1">
                  This covers income tax on your <TaxTerm term="k1_distribution">K-1 distribution</TaxTerm>. Your salary and spouse income are covered by payroll withholding.
                </p>
              )}
              <div className="flex items-center justify-center gap-2 mt-2">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                <Badge variant={nextDue.daysUntil <= 14 ? 'destructive' : 'secondary'} className="text-[10px]">
                  <Clock className="h-3 w-3 mr-0.5" />
                  {nextDue.daysUntil} days
                </Badge>
              </div>
              <div className="flex gap-2 justify-center mt-3 flex-wrap">
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setPaymentDialogOpen(true)}>
                  <CreditCard className="h-3.5 w-3.5" /> Pay federal →
                </Button>
                {taxResult.stateBreakdown && taxResult.stateBreakdown.length > 1 ? (
                  taxResult.stateBreakdown
                    .filter(s => s.taxOwed > 0)
                    .map(s => (
                      <Button key={s.stateKey} size="sm" variant="outline" className="gap-1.5" onClick={() => setPaymentDialogOpen(true)}>
                        Pay {s.stateKey} →
                      </Button>
                    ))
                ) : (
                  profile.state_code && TAX_CONSTANTS.states[profile.state_code]?.type !== 'none' && (
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setPaymentDialogOpen(true)}>
                      Pay {profile.state_code} →
                    </Button>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ═══ PAYMENT HUB DIALOG ═══ */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-[680px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Make Your Payment — {nextDue?.label || 'Q1'}
            </DialogTitle>
          </DialogHeader>
          <TaxPaymentHub
            profile={profile}
            taxResult={calculateTax(profile.annual_relief_income, profile) as any}
            nextDue={nextDue}
            paymentLogs={paymentLogs}
          />
        </DialogContent>
      </Dialog>

      {/* ═══ MATH BREAKDOWN ═══ */}
      <Collapsible open={breakdownOpen} onOpenChange={setBreakdownOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 group">
          <DollarSign className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold flex-1">How we got there</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-2">
            <CardContent className="pt-4 space-y-2 text-sm">
              {is1099 && taxResult.path === '1099' && render1099Breakdown(taxResult)}
              {isScorp && taxResult.path === 'scorp' && renderSCorpBreakdown(taxResult, profile)}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>


      {/* ═══ QUARTERLY TIMELINE ═══ */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Quarterly Payment Timeline</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(q => {
            const dd = dueDates[q];
            const isPast = new Date(dd.due) < now;
            const isCurrent = q === currentQuarter;
            const fedPaid = paymentLogs.getQuarterTotal(dd.label, 'federal_1040es');
            const isFullyPaid = fedPaid >= quarterlyPayment && quarterlyPayment > 0;
            return (
              <Card key={q} className={`${isCurrent ? 'border-primary ring-1 ring-primary/20' : ''}`}>
                <CardContent className="p-3 text-center">
                  <p className="text-xs font-medium text-muted-foreground">{dd.label}</p>
                  <p className="text-xs text-muted-foreground">{dd.months}</p>
                  <p className="text-lg font-bold mt-1">${fmt(quarterlyPayment)}</p>
                  {is1099 && taxResult.path === '1099' && (
                    <div className="text-[10px] text-muted-foreground mt-0.5 space-y-0">
                      <p>Fed ${fmt(Math.round(taxResult.vetFederalShare / 4))} · SE ${fmt(Math.round(taxResult.totalSeTax / 4))}</p>
                      {taxResult.stateTax > 0 && <p>{profile.state_code} ${fmt(Math.round(taxResult.stateTax / 4))}</p>}
                    </div>
                  )}
                  {isScorp && taxResult.path === 'scorp' && (
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      <p>Fed ${fmt(Math.round(taxResult.federalOnDistribution / 4))}{taxResult.stateOnDistribution > 0 ? ` · ${profile.state_code} $${fmt(Math.round(taxResult.stateOnDistribution / 4))}` : ''}</p>
                    </div>
                  )}
                  <p className="text-[11px] text-muted-foreground">Due {dd.due}</p>
                  {isFullyPaid ? (
                    <Badge variant="secondary" className="mt-1 text-[10px] gap-0.5">
                      <CheckCircle2 className="h-3 w-3" /> Paid
                    </Badge>
                  ) : isCurrent ? (
                    <Badge className="mt-1 text-[10px]">Current</Badge>
                  ) : isPast ? (
                    <Badge variant="secondary" className="mt-1 text-[10px]">Past</Badge>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ═══ SCHEDULE IMPACT — hidden for now ═══ */}
      {/* <TaxProjectionDisplay
        dayRate={dayRate}
        timezone={Intl.DateTimeFormat().resolvedOptions().timeZone}
        stateCode={profile.state_code || undefined}
        selectedScheduleIndex={scheduleIndex}
        onScheduleChange={handleScheduleChange}
        variant="page"
        entityType={(profile.entity_type as '1099' | 'scorp') || '1099'}
        scorpSalary={profile.scorp_salary || undefined}
        filingStatus={profile.filing_status || undefined}
        spouseW2Income={profile.spouse_w2_income || undefined}
        retirementContributions={profile.retirement_contribution || undefined}
        annualBusinessExpenses={profile.annual_business_expenses || undefined}
      /> */}

      {/* ═══ SAVE NUDGE ═══ */}
      <Alert className="border-[hsl(var(--info))] bg-[hsl(var(--chip-info-bg))]">
        <DollarSign className="h-4 w-4 text-[hsl(var(--chip-info-text))]" />
        <AlertDescription className="text-sm text-[hsl(var(--chip-info-text))]">
          <strong>Set aside {Math.ceil(effectiveRate)}%</strong> (<TaxTerm term="effective_rate">effective rate</TaxTerm>) of each payment to cover taxes. That's <strong>${fmt(Math.round((effectiveRate / 100) * 1000))} per $1,000 earned</strong>.
        </AlertDescription>
      </Alert>

      {/* ═══ PAYMENT HISTORY ═══ */}
      <TaxPaymentHistory payments={paymentLogs.payments} />

      {/* ═══ DISCLAIMER ═══ */}
      <div className="space-y-1">
        <p className="text-[11px] text-muted-foreground text-center">
          Estimates based on {TAX_CONSTANTS.taxYear} published federal rates
          {profile.state_code ? ` and ${profile.state_code} rates` : ''}
        </p>
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {V1_DISCLAIMER}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── 1099 Breakdown ──────────────────────────────────
function render1099Breakdown(r: Tax1099Result) {
  return (
    <>
      <Row label="Gross relief income" value={r.grossIncome} />
      <Row label="Business expenses" value={-r.expenses} />
      <Row label="Net self-employment income" value={r.netIncome} bold term="net_income" />
      <div className="border-t my-2" />
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"><TaxTerm term="se_tax">SE Tax</TaxTerm></p>
      <Row label={`Social Security (12.4%) · capped at $${fmt(TAX_CONSTANTS.ssWageBase)}`} value={r.ssTax} />
      <Row label="Medicare (2.9%)" value={r.medicareTax} />
      {r.additionalMedicare > 0 && <Row label="Additional Medicare (0.9%)" value={r.additionalMedicare} />}
      <Row label="Total SE tax" value={r.totalSeTax} bold term="se_tax" />
      <div className="border-t my-2" />
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Federal Income Tax</p>
      <Row label="Household AGI" value={r.agi} term="agi" />
      <Row label="Standard deduction" value={-TAX_CONSTANTS.standardDeduction.single} term="standard_deduction" />
      <Row label="Federal taxable income" value={r.federalTaxableIncome} term="federal_taxable_income" />
      <Row label={`Tax (at ${Math.round(r.marginalRate * 100)}% marginal rate)`} value={r.totalFederalTax} term="marginal_rate" />
      {r.spouseWithholdingEstimate > 0 && <Row label="Less: spouse withholding" value={-r.spouseWithholdingEstimate} sub="covered by her employer" term="spouse_withholding" />}
      <Row label="Your federal share" value={r.vetFederalShare} bold />
      <div className="border-t my-2" />
      {r.stateBreakdown && r.stateBreakdown.length > 1 ? (
        <>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">State tax (multi-state)</p>
          {r.stateBreakdown.map((s) => (
            <Row
              key={s.stateKey}
              label={`${s.stateKey}${s.isResident ? ' (resident, after credit)' : ' (non-resident)'}`}
              value={s.taxOwed}
              sub={`Allocated income: $${s.incomeAllocated.toLocaleString()}`}
            />
          ))}
          <Row label="Total state tax" value={r.stateTax} bold />
        </>
      ) : (
        <Row label="State tax" value={r.stateTax} />
      )}
      <div className="border-t my-2" />
      <Row label="Annual tax due via 1040-ES" value={r.annualEstimatedTaxDue} bold term="1040es" />
      <Row label="Quarterly payment" value={r.quarterlyPayment} bold term="quarterly_payment" />
    </>
  );
}

// ── S-Corp Breakdown ────────────────────────────────
function renderSCorpBreakdown(r: TaxSCorpResult, profile: TaxIntelligenceProfile) {
  return (
    <>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your S-Corp P&L</p>
      <Row label="Gross revenue" value={r.grossRevenue} />
      <Row label="Operating expenses" value={-r.operatingExpenses} />
      <Row label="Your W-2 salary" value={-r.salary} term="w2_salary" />
      <Row label="Employer FICA (7.65%)" value={-r.employerFica} sub="S-Corp expense, not your 1040-ES" term="employer_fica" />
      <Row label="K-1 distribution" value={r.distribution} bold sub="← this is what needs quarterly payment" term="k1_distribution" />
      <div className="border-t my-2" />

      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Personal Tax Picture</p>
      <div className="rounded-lg border overflow-hidden mt-2 mb-2">
        <div className="grid grid-cols-3 text-xs font-semibold text-muted-foreground bg-muted/30 px-3 py-2">
          <span>Income source</span>
          <span className="text-right">Amount</span>
          <span className="text-right">Tax covered by</span>
        </div>
        <div className="grid grid-cols-3 text-sm px-3 py-2 border-t">
          <span className="text-muted-foreground"><TaxTerm term="w2_salary">Your W-2 salary</TaxTerm></span>
          <span className="text-right">${fmt(r.salary)}</span>
          <span className="text-right text-xs text-muted-foreground">Payroll withholding ✓</span>
        </div>
        <div className="grid grid-cols-3 text-sm px-3 py-2 border-t">
          <span className="text-muted-foreground"><TaxTerm term="k1_distribution">Your K-1 dist.</TaxTerm></span>
          <span className="text-right">${fmt(r.distribution)}</span>
          <span className="text-right text-xs text-amber-500 font-medium">→ Your <TaxTerm term="1040es">1040-ES</TaxTerm> ←</span>
        </div>
        {profile.spouse_w2_income > 0 && (
          <div className="grid grid-cols-3 text-sm px-3 py-2 border-t">
            <span className="text-muted-foreground">Spouse W-2</span>
            <span className="text-right">${fmt(profile.spouse_w2_income)}</span>
            <span className="text-right text-xs text-muted-foreground"><TaxTerm term="spouse_withholding">Her employer ✓</TaxTerm></span>
          </div>
        )}
      </div>

      <Row label={`Federal on K-1 (at ${Math.round(r.marginalRate * 100)}% marginal)`} value={r.federalOnDistribution} term="marginal_rate" />
      {r.stateBreakdown && r.stateBreakdown.length > 1 ? (
        <>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2">State tax (multi-state)</p>
          {r.stateBreakdown.map((s) => (
            <Row
              key={s.stateKey}
              label={`${s.stateKey}${s.isResident ? ' (resident, after credit)' : ' (non-resident)'}`}
              value={s.taxOwed}
              sub={`Allocated income: $${s.incomeAllocated.toLocaleString()}`}
            />
          ))}
          <Row label="Total state tax" value={r.stateTax} bold />
        </>
      ) : (
        <Row label={`State on K-1 (${profile.state_code || 'N/A'})`} value={r.stateOnDistribution} />
      )}
      {r.extraWithholdingAnnual > 0 && <Row label="Extra withholding credit" value={-r.extraWithholdingAnnual} term="extra_withholding" />}
      <div className="border-t my-2" />
      <Row label="Annual 1040-ES obligation" value={r.annualEstimatedTaxDue} bold term="1040es" />
      <Row label="Quarterly payment" value={r.quarterlyPayment} bold term="quarterly_payment" />
    </>
  );
}

function Row({ label, value, bold, sub, term }: { label: string; value: number; bold?: boolean; sub?: string; term?: string }) {
  const isNegative = value < 0;
  return (
    <div>
      <div className={`flex justify-between text-sm ${bold ? 'font-semibold' : ''}`}>
        <span className="text-muted-foreground">
          {term ? <TaxTerm term={term}>{label}</TaxTerm> : label}
        </span>
        <span className={isNegative ? '' : value > 0 ? '' : ''}>
          {isNegative ? '-' : ''}${fmt(Math.abs(value))}
        </span>
      </div>
      {sub && <p className="text-[10px] text-muted-foreground text-right">{sub}</p>}
    </div>
  );
}
