import { useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { useExpenses } from '@/hooks/useExpenses';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Receipt, PiggyBank, Building2, CalendarDays, BookOpen,
  ArrowRight, AlertTriangle, Info, ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { TaxIntelligenceProfile } from '@/hooks/useTaxIntelligence';
import {
  STANDARD_DEDUCTIONS, SS_WAGE_CAP, SE_TAXABLE_FACTOR,
  RETIREMENT_LIMITS, FICA_RATE, TAX_YEAR_CONFIG,
  getMarginalRate, type FilingStatus,
} from '@/lib/taxConstants2026';
import { applyStateBrackets } from '@/lib/stateTaxData';

interface Props {
  profile: TaxIntelligenceProfile;
}

function fmt(n: number) {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function round2(n: number) { return Math.round(n * 100) / 100; }

export default function TaxReductionGuide({ profile }: Props) {
  const { invoices } = useData();
  const { expenses: loggedExpenses } = useExpenses();
  const navigate = useNavigate();
  const isScorp = profile.entity_type === 'scorp';
  const fs = (profile.filing_status || 'single') as FilingStatus;

  const ytdPaidIncome = useMemo(() => {
    const year = new Date().getFullYear();
    return invoices
      .filter(inv => inv.status === 'paid' && inv.paid_at && new Date(inv.paid_at).getFullYear() === year)
      .reduce((sum, inv) => sum + inv.total_amount, 0);
  }, [invoices]);

  const loggedExpenseTotal = useMemo(() => {
    const year = new Date().getFullYear();
    return loggedExpenses
      .filter(e => new Date(e.expense_date).getFullYear() === year)
      .reduce((sum, e) => sum + e.deductible_amount_cents / 100, 0);
  }, [loggedExpenses]);

  const projectedExpenses = loggedExpenseTotal > 0 ? Math.round(loggedExpenseTotal * (12 / Math.max(1, new Date().getMonth() + 1))) : 0;

  // Compute net income for bracket lookup
  const netForCalc = Math.max(0, ytdPaidIncome - (profile.ytd_expenses_estimate || 0));
  const seBase = netForCalc * SE_TAXABLE_FACTOR;
  const seDeduction = round2((Math.min(seBase, SS_WAGE_CAP) * 0.124 + seBase * 0.029) / 2);
  const spouseW2 = profile.spouse_w2_income || 0;
  const spouseSE = profile.spouse_has_se_income ? (profile.spouse_se_net_income || 0) : 0;
  const agi = Math.max(0, netForCalc - seDeduction - (profile.retirement_contribution || 0) + spouseW2 + spouseSE);
  const standardDed = STANDARD_DEDUCTIONS[fs] || STANDARD_DEDUCTIONS.single;
  const taxableIncome = Math.max(0, agi - standardDed);
  const marginalRate = getMarginalRate(taxableIncome, fs);

  // S-Corp savings estimate
  const annualizedNet = netForCalc > 0 ? (netForCalc / Math.max(1, new Date().getMonth() + 1)) * 12 : 0;
  const seTax = round2(Math.min(annualizedNet * SE_TAXABLE_FACTOR, SS_WAGE_CAP) * 0.124 + annualizedNet * SE_TAXABLE_FACTOR * 0.029);
  const salary60 = Math.round(annualizedNet * 0.6);
  const scorpPayroll = round2(Math.min(salary60, annualizedNet) * FICA_RATE * 2);
  const scorpSavings = round2(seTax - scorpPayroll);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">How to Reduce Your Quarterly Tax Burden</h2>
        <p className="text-sm text-muted-foreground">Four levers — ranked by impact for your situation</p>
      </div>

      {/* ═══ LEVER 1: EXPENSES ═══ */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Lever 1 — Business Expense Deductions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Every deductible dollar reduces both your income tax {!isScorp && 'and self-employment tax'}. This is your easiest win.
          </p>

          {loggedExpenseTotal > 0 && (
            <Alert className="border-[hsl(var(--chip-success-bg))] bg-[hsl(var(--chip-success-bg))]">
              <Info className="h-4 w-4 text-[hsl(var(--chip-success-text))]" />
              <AlertDescription className="text-sm text-[hsl(var(--chip-success-text))]">
                Based on your logged expenses so far ({fmt(loggedExpenseTotal)}), you're on track for {fmt(projectedExpenses)} annually.
                The average relief vet in your income range deducts $8,000–$14,000.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-1">
            <p className="text-sm font-medium">Commonly missed deductions for relief vets:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Mileage between clinics ({TAX_YEAR_CONFIG.standardMileageRate * 100}¢/mile for {TAX_YEAR_CONFIG.activeYear})</li>
              <li>DEA registration & state license fees</li>
              <li>USDA accreditation</li>
              <li>CE / conference travel</li>
              <li>Professional liability insurance</li>
              <li>Scrubs & medical equipment</li>
              <li>Software subscriptions (including this one)</li>
            </ul>
          </div>

          <Button variant="outline" size="sm" onClick={() => navigate('/expenses')} className="gap-1">
            Log an Expense <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </CardContent>
      </Card>

      {/* ═══ LEVER 2: RETIREMENT ═══ */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-primary" />
            Lever 2 — Retirement Contributions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            SEP-IRA and Solo 401(k) contributions reduce your AGI dollar-for-dollar. This is often the single biggest tax reduction available.
          </p>

          <div className="rounded border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2 font-medium">Contribution</th>
                  <th className="text-right p-2 font-medium">Estimated Tax Savings</th>
                </tr>
              </thead>
              <tbody>
                {[10000, 20000, 40000].map(amount => (
                  <tr key={amount} className="border-t">
                    <td className="p-2">{fmt(amount)}</td>
                    <td className="p-2 text-right font-medium text-[hsl(var(--chip-success-text))]">
                      {fmt(Math.round(amount * marginalRate))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {profile.retirement_contribution > 0 && (
            <p className="text-sm text-muted-foreground">
              You've indicated {fmt(profile.retirement_contribution)} in retirement contributions.
              This saves you an estimated <strong>{fmt(Math.round(profile.retirement_contribution * marginalRate))}</strong> in federal tax.
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            {TAX_YEAR_CONFIG.activeYear} limits: SEP-IRA up to 25% of net or ${RETIREMENT_LIMITS.sep_ira.maxContribution.toLocaleString()} · Solo 401(k) ${RETIREMENT_LIMITS.solo_401k.employeeMax.toLocaleString()} employee + 25% employer, total ${RETIREMENT_LIMITS.solo_401k.totalMax.toLocaleString()}
          </p>
        </CardContent>
      </Card>

      {/* ═══ LEVER 3: S-CORP (1099 only) ═══ */}
      {!isScorp && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Lever 3 — S-Corp Election
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {annualizedNet >= 80000 ? (
              <>
                <p className="text-sm text-muted-foreground">
                  At your projected income of {fmt(annualizedNet)}, electing S-Corp could save you approximately <strong className="text-[hsl(var(--chip-success-text))]">{fmt(Math.max(0, scorpSavings))}/year in SE tax</strong>.
                </p>
                <p className="text-sm text-muted-foreground">
                  Setup and ongoing costs are typically $2,500–$4,000/year. Your estimated savings would exceed this at $80,000+ net income.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                At your current income level ({fmt(annualizedNet)}), the savings are modest.
                This becomes more compelling as your relief work grows past $80,000 in net income.
              </p>
            )}
            <Button variant="outline" size="sm" className="gap-1" asChild>
              <a href="https://www.irs.gov/businesses/small-businesses-self-employed/s-corporations" target="_blank" rel="noopener noreferrer">
                Learn More About S-Corps <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ═══ LEVER 4: QUARTERLY TIMING ═══ */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Lever 4 — Quarterly Timing & Safe Harbor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            There are two methods for calculating quarterly payments:
          </p>
          <div className="space-y-2">
            <div className="rounded border p-3">
              <p className="text-sm font-medium">90% of current year's tax</p>
              <p className="text-xs text-muted-foreground">More accurate but amounts vary each quarter based on income</p>
            </div>
            <div className="rounded border p-3">
              <p className="text-sm font-medium">100%/110% of prior year's tax (safe harbor)</p>
              <p className="text-xs text-muted-foreground">Steady payments — avoids underpayment penalties regardless of income changes</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            You're currently using the <strong>{profile.safe_harbor_method === 'safe_harbor' ? 'safe harbor (prior year)' : '90% current year'}</strong> method.
          </p>
          <p className="text-xs text-muted-foreground">
            The underpayment penalty is currently ~8% annualized on any shortfall. Using safe harbor eliminates this risk.
          </p>
        </CardContent>
      </Card>

      {/* ═══ FOOTER: WHEN TO CALL YOUR CPA ═══ */}
      <Card className="bg-muted/30">
        <CardContent className="pt-5 space-y-2">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">When to Call Your CPA</span>
          </div>
          <p className="text-sm text-muted-foreground">
            This guide covers the most impactful levers. Your CPA should weigh in on: QBI deduction (20% pass-through),
            defined benefit plans if you're over $200K, itemized vs standard deduction, and state-specific strategies.
          </p>
          <p className="text-sm text-muted-foreground">
            Bring them a clean export from LocumOps to make that conversation faster and cheaper.
          </p>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <p className="text-[11px] text-muted-foreground text-center">
        <Info className="h-3 w-3 inline mr-1" />
        These estimates are designed for planning and budgeting, not for filing. We recommend reviewing your numbers with a CPA or tax professional before making final decisions.
      </p>
    </div>
  );
}
