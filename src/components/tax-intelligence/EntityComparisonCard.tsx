import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowRight, Info, Scale } from 'lucide-react';
import type { TaxIntelligenceProfile } from '@/hooks/useTaxIntelligence';
import { calculate1099Tax, calculateSCorpTax, mapDbProfileToV1 } from '@/lib/taxCalculatorV1';
import { ENTITY_DISCLAIMER } from '@/components/tax-strategy/TaxDisclaimer';
import TaxTerm from './TaxTerm';

interface Props {
  profile: TaxIntelligenceProfile;
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export default function EntityComparisonCard({ profile }: Props) {
  const baseProfile = useMemo(() => mapDbProfileToV1(profile), [profile]);
  const netIncome = Math.max(0, (baseProfile.annualReliefIncome || 0) - (baseProfile.annualBusinessExpenses || 0));

  const defaultSalaryPct = profile.scorp_salary > 0
    ? Math.round((profile.scorp_salary / netIncome) * 100)
    : 40;
  const [salaryPct, setSalaryPct] = useState(Math.min(60, Math.max(30, defaultSalaryPct)));

  const scorpSalary = Math.round(netIncome * (salaryPct / 100));

  const result1099 = useMemo(
    () => calculate1099Tax({ ...baseProfile, entityType: '1099' }),
    [baseProfile],
  );

  const resultScorp = useMemo(
    () => calculateSCorpTax({ ...baseProfile, entityType: 'scorp', scorpSalary }),
    [baseProfile, scorpSalary],
  );

  const savings1099 = result1099.annualEstimatedTaxDue + result1099.totalSeTax;
  const savingsScorp = resultScorp.annualEstimatedTaxDue + resultScorp.totalAlreadyWithheld;
  const totalScorp = resultScorp.totalFederalTax + resultScorp.stateTax + resultScorp.employerFica;
  const total1099 = result1099.totalFederalTax + result1099.stateTax + result1099.totalSeTax;
  const annualSavings = total1099 - totalScorp;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Scale className="h-4 w-4 text-primary" />
          1099 vs S-Corp Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Salary slider */}
        <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">S-Corp <TaxTerm term="w2_salary">W-2 salary</TaxTerm></span>
            <span className="font-semibold">${fmt(scorpSalary)} <span className="text-muted-foreground font-normal">({salaryPct}%)</span></span>
          </div>
          <Slider
            value={[salaryPct]}
            onValueChange={([v]) => setSalaryPct(v)}
            min={30}
            max={60}
            step={1}
          />
          <p className="text-[10px] text-muted-foreground">
            <TaxTerm term="reasonable_compensation">Reasonable compensation</TaxTerm> range: 30–60% of net income
          </p>
        </div>

        {/* Comparison columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* 1099 column */}
          <div className="rounded-xl border p-4 space-y-2">
            <Badge variant="outline" className="mb-2">1099 / Sole Prop</Badge>
            <CompRow label="Gross income" value={result1099.grossIncome} />
            <CompRow label="Expenses" value={-result1099.expenses} />
            <CompRow label="Net income" value={result1099.netIncome} bold term="net_income" />
            <div className="border-t my-2" />
            <CompRow label="SE tax" value={result1099.totalSeTax} highlight term="se_tax" />
            <CompRow label="Federal tax" value={result1099.totalFederalTax} />
            <CompRow label="State tax" value={result1099.stateTax} />
            <div className="border-t my-2" />
            <CompRow label="Total tax burden" value={total1099} bold />
            <CompRow label="Quarterly 1040-ES" value={result1099.quarterlyPayment} bold term="1040es" />
          </div>

          {/* S-Corp column */}
          <div className="rounded-xl border border-primary/20 bg-primary/[0.02] p-4 space-y-2">
            <Badge className="mb-2 bg-primary/10 text-primary border-primary/20">S-Corporation</Badge>
            <CompRow label="Gross revenue" value={resultScorp.grossRevenue} />
            <CompRow label="Expenses" value={-resultScorp.operatingExpenses} />
            <CompRow label="W-2 salary" value={-resultScorp.salary} term="w2_salary" />
            <CompRow label="Employer FICA" value={-resultScorp.employerFica} sub="Corp expense" term="employer_fica" />
            <CompRow label="K-1 distribution" value={resultScorp.distribution} bold term="k1_distribution" />
            <div className="border-t my-2" />
            <CompRow label="SE tax" value={0} highlight saved term="se_tax" />
            <CompRow label="Federal tax" value={resultScorp.totalFederalTax} />
            <CompRow label="State tax" value={resultScorp.stateTax} />
            <div className="border-t my-2" />
            <CompRow label="Total tax burden" value={totalScorp} bold />
            <CompRow label="Quarterly 1040-ES" value={resultScorp.quarterlyPayment} bold term="1040es" />
          </div>
        </div>

        {/* Savings banner */}
        {annualSavings > 1000 && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-2">
              <ArrowRight className="h-4 w-4" />
              Potential annual savings as S-Corp: ~${fmt(annualSavings)}
            </p>
            <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/70 mt-1">
              Primarily from eliminating <TaxTerm term="se_tax">SE tax</TaxTerm> on your <TaxTerm term="k1_distribution">K-1 distribution</TaxTerm>
            </p>
          </div>
        )}

        {annualSavings <= 1000 && annualSavings >= -1000 && (
          <div className="rounded-lg bg-muted/50 border p-3 text-center">
            <p className="text-sm text-muted-foreground">
              At this income level, both structures result in similar tax obligations.
            </p>
          </div>
        )}

        {annualSavings < -1000 && (
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-center">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              1099 may be more tax-efficient at this income level by ~${fmt(Math.abs(annualSavings))}/year
            </p>
          </div>
        )}

        {/* Disclaimer */}
        <Alert className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800/50">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertDescription className="text-muted-foreground text-xs">
            {ENTITY_DISCLAIMER} S-Corp has additional costs (payroll service ~$500–$2,000/yr, separate corporate tax return ~$1,000–$2,500/yr) not reflected above.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

function CompRow({ label, value, bold, sub, highlight, saved, term }: {
  label: string; value: number; bold?: boolean; sub?: string; highlight?: boolean; saved?: boolean; term?: string;
}) {
  const isNeg = value < 0;
  return (
    <div>
      <div className={`flex justify-between text-sm ${bold ? 'font-semibold' : ''}`}>
        <span className="text-muted-foreground">
          {term ? <TaxTerm term={term}>{label}</TaxTerm> : label}
        </span>
        <span className={saved ? 'text-emerald-600 dark:text-emerald-400 line-through' : highlight ? 'text-amber-600 dark:text-amber-400' : ''}>
          {isNeg ? '-' : ''}${fmt(Math.abs(value))}
        </span>
      </div>
      {sub && <p className="text-[10px] text-muted-foreground text-right">{sub}</p>}
    </div>
  );
}
