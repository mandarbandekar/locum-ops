import { useState } from 'react';
import { ChevronDown, ChevronUp, Lock, Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import type { StrategyResult, StrategyInputs } from '@/lib/taxStrategies';
import { RETIREMENT_LIMITS, SE_TAXABLE_FACTOR } from '@/lib/taxConstants2026';
import DeductionChecklist from './DeductionChecklist';
import { getQuarterlyDeadlines, getNextQuarterlyDeadline } from '@/lib/taxStrategies';

interface Props {
  strategy: StrategyResult;
  inputs: StrategyInputs;
  annualizedIncome: number;
  combinedRate: number;
  entityType?: string;
  onUpdateInputs: (patch: Partial<StrategyInputs>) => void;
  onDismiss: (id: string) => void;
  onRestore: (id: string) => void;
}

export default function StrategyCard({
  strategy, inputs, annualizedIncome, combinedRate, entityType = 'sole_prop',
  onUpdateInputs, onDismiss, onRestore,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const statusDot = strategy.status === 'action_available'
    ? 'bg-emerald-500'
    : strategy.status === 'dismissed'
    ? 'bg-blue-500'
    : 'bg-muted-foreground/40';

  return (
    <Card className={`transition-all ${!strategy.eligible ? 'opacity-60' : ''}`}>
      {/* Collapsed Header */}
      <button
        onClick={() => strategy.eligible && setExpanded(!expanded)}
        className="w-full p-4 flex items-center gap-3 text-left"
        disabled={!strategy.eligible}
      >
        <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${statusDot}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{strategy.title}</p>
          <p className="text-xs text-muted-foreground truncate">{strategy.description}</p>
        </div>
        {!strategy.eligible && strategy.unlockLabel && (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
            <Lock className="h-3 w-3" />
            {strategy.unlockLabel}
          </span>
        )}
        {strategy.eligible && strategy.estimatedSavings > 0 && (
          <span className="text-sm font-bold text-emerald-500 shrink-0">
            ${strategy.estimatedSavings.toLocaleString()}
          </span>
        )}
        {strategy.eligible && (
          expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {/* Expanded Detail */}
      {expanded && strategy.eligible && (
        <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
          {/* Why This Matters */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Why This Matters</h4>
            <p className="text-sm text-foreground">{strategy.whyItMatters}</p>
          </div>

          {/* How It Works */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">How It Works</h4>
            <ul className="space-y-1">
              {strategy.howItWorks.map((step, i) => (
                <li key={i} className="text-sm text-muted-foreground flex gap-2">
                  <span className="text-primary font-medium shrink-0">•</span>
                  {step}
                </li>
              ))}
            </ul>
          </div>

          {/* Interactive Calculator */}
          {renderCalculator(strategy.id, inputs, annualizedIncome, combinedRate, onUpdateInputs, entityType)}

          {/* Estimated Savings */}
          {strategy.estimatedSavings > 0 && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-sm font-medium text-foreground">Your estimated savings</p>
              <p className="text-lg font-bold text-emerald-500">${strategy.estimatedSavings.toLocaleString()}</p>
            </div>
          )}

          {/* Action Steps */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Action Steps</h4>
            <ol className="space-y-1">
              {strategy.actionSteps.map((step, i) => (
                <li key={i} className="text-sm text-muted-foreground flex gap-2">
                  <span className="text-primary font-semibold shrink-0">{i + 1}.</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {/* Disclaimer */}
          <p className="text-xs italic text-muted-foreground">
            This is educational information, not tax advice. Consult a qualified CPA before making tax decisions.
          </p>

          {/* Dismiss / Restore */}
          <div className="flex justify-end">
            {strategy.dismissed ? (
              <Button variant="ghost" size="sm" onClick={() => onRestore(strategy.id)}>
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restore
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => onDismiss(strategy.id)}>
                <Check className="h-3.5 w-3.5 mr-1" /> Mark as Done
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function renderCalculator(
  strategyId: string,
  inputs: StrategyInputs,
  annualizedIncome: number,
  combinedRate: number,
  onUpdate: (patch: Partial<StrategyInputs>) => void,
  entityType: string = 'sole_prop',
) {
  switch (strategyId) {
    case 'vet_deductions':
      return <DeductionChecklist inputs={inputs} combinedRate={combinedRate} onUpdate={onUpdate} />;

    case 'home_office': {
      const sqft = inputs.home_office_sqft || 150;
      const deduction = Math.min(sqft * 5, 1500);
      const savings = Math.round(deduction * combinedRate);
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Office square footage</p>
            <p className="text-sm font-medium">{sqft} sq ft</p>
          </div>
          <Slider
            value={[sqft]}
            min={50}
            max={300}
            step={10}
            onValueChange={([v]) => onUpdate({ home_office_sqft: v })}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Deduction: ${deduction.toLocaleString()}</span>
            <span className="text-emerald-500 font-medium">Saves ≈ ${savings.toLocaleString()}</span>
          </div>
        </div>
      );
    }

    case 'mileage': {
      const miles = inputs.weekly_business_miles || 50;
      const annual = miles * 52;
      const deduction = Math.round(annual * 0.725);
      const savings = Math.round(deduction * combinedRate);
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground flex-1">Weekly business miles</p>
            <Input
              type="number"
              value={miles}
              onChange={e => onUpdate({ weekly_business_miles: parseFloat(e.target.value) || 0 })}
              className="w-24 h-8 text-sm"
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{annual.toLocaleString()} miles/yr × $0.725 = ${deduction.toLocaleString()}</span>
            <span className="text-emerald-500 font-medium">Saves ≈ ${savings.toLocaleString()}</span>
          </div>
        </div>
      );
    }

    case 'sep_ira': {
      const netSE = annualizedIncome * SE_TAXABLE_FACTOR;
      const maxContribution = Math.min(netSE * RETIREMENT_LIMITS.sep_ira.percentOfNet, RETIREMENT_LIMITS.sep_ira.maxContribution);
      const contribution = inputs.retirement_contribution_slider > 0 ? Math.min(inputs.retirement_contribution_slider, maxContribution) : maxContribution;
      const savings = Math.round(contribution * combinedRate);
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Contribution amount</p>
            <p className="text-sm font-medium">${Math.round(contribution).toLocaleString()}</p>
          </div>
          <Slider
            value={[contribution]}
            min={0}
            max={Math.round(maxContribution)}
            step={500}
            onValueChange={([v]) => onUpdate({ retirement_contribution_slider: v })}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Max: ${Math.round(maxContribution).toLocaleString()}</span>
            <span className="text-emerald-500 font-medium">Saves ≈ ${savings.toLocaleString()}</span>
          </div>
        </div>
      );
    }

    case 'solo_401k': {
      const netSE = annualizedIncome * SE_TAXABLE_FACTOR;
      const sepMax = Math.min(netSE * 0.25, RETIREMENT_LIMITS.sep_ira.maxContribution);
      const solo401kEmployer = netSE * 0.25;
      const solo401kMax = Math.min(RETIREMENT_LIMITS.solo_401k.employeeMax + solo401kEmployer, RETIREMENT_LIMITS.solo_401k.totalMax);
      return (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="grid grid-cols-3 text-xs font-semibold text-muted-foreground bg-muted/30 px-3 py-2">
            <span></span>
            <span className="text-center">SEP-IRA</span>
            <span className="text-center">Solo 401(k)</span>
          </div>
          <div className="grid grid-cols-3 text-sm px-3 py-2 border-t border-border">
            <span className="text-muted-foreground">Employee</span>
            <span className="text-center">—</span>
            <span className="text-center font-medium">${RETIREMENT_LIMITS.solo_401k.employeeMax.toLocaleString()}</span>
          </div>
          <div className="grid grid-cols-3 text-sm px-3 py-2 border-t border-border">
            <span className="text-muted-foreground">Employer (25%)</span>
            <span className="text-center">${Math.round(sepMax).toLocaleString()}</span>
            <span className="text-center">${Math.round(solo401kEmployer).toLocaleString()}</span>
          </div>
          <div className="grid grid-cols-3 text-sm px-3 py-2 border-t border-border font-bold">
            <span>Total Max</span>
            <span className="text-center">${Math.round(sepMax).toLocaleString()}</span>
            <span className="text-center text-emerald-500">${Math.round(solo401kMax).toLocaleString()}</span>
          </div>
          {solo401kMax > sepMax && (
            <div className="px-3 py-2 border-t border-border bg-emerald-500/5">
              <p className="text-xs text-emerald-500 font-medium text-center">
                Solo 401(k) allows ${Math.round(solo401kMax - sepMax).toLocaleString()} more in contributions
              </p>
            </div>
          )}
        </div>
      );
    }

    case 'scorp': {
      const salary = inputs.scorp_salary_slider;
      const netSE = annualizedIncome * SE_TAXABLE_FACTOR;
      const currentSETax = Math.round(Math.min(netSE, 184500) * 0.124 + netSE * 0.029);
      const cappedSalary = Math.min(salary, annualizedIncome);
      const sCorpPayroll = Math.round((Math.min(cappedSalary, 184500) * 0.124 + cappedSalary * 0.029) * 2);
      const overhead = 2500;
      const netSavings = Math.max(0, currentSETax - sCorpPayroll - overhead);

      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Reasonable salary</p>
            <p className="text-sm font-medium">${Math.round(salary).toLocaleString()}</p>
          </div>
          <Slider
            value={[salary]}
            min={80000}
            max={Math.min(200000, annualizedIncome)}
            step={5000}
            onValueChange={([v]) => onUpdate({ scorp_salary_slider: v })}
          />
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="grid grid-cols-3 text-xs font-semibold text-muted-foreground bg-muted/30 px-3 py-2">
              <span></span>
              <span className="text-center">Sole Prop</span>
              <span className="text-center">S-Corp</span>
            </div>
            <div className="grid grid-cols-3 text-sm px-3 py-2 border-t border-border">
              <span className="text-muted-foreground">Gross Income</span>
              <span className="text-center">${Math.round(annualizedIncome).toLocaleString()}</span>
              <span className="text-center">${Math.round(annualizedIncome).toLocaleString()}</span>
            </div>
            <div className="grid grid-cols-3 text-sm px-3 py-2 border-t border-border">
              <span className="text-muted-foreground">SE / Payroll Tax</span>
              <span className="text-center">${currentSETax.toLocaleString()}</span>
              <span className="text-center">${sCorpPayroll.toLocaleString()}</span>
            </div>
            <div className="grid grid-cols-3 text-sm px-3 py-2 border-t border-border">
              <span className="text-muted-foreground">Overhead</span>
              <span className="text-center">$0</span>
              <span className="text-center">${overhead.toLocaleString()}</span>
            </div>
            <div className="grid grid-cols-3 text-sm px-3 py-2 border-t border-border font-bold">
              <span>Net Savings</span>
              <span className="text-center">—</span>
              <span className="text-center text-emerald-500">${netSavings.toLocaleString()}/yr</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Note: Reasonable salary should reflect what an employed DVM in a similar role would earn.
          </p>
        </div>
      );
    }

    case 'quarterly_deadlines': {
      const deadlines = getQuarterlyDeadlines();
      const next = getNextQuarterlyDeadline();
      const quarterlyPayment = annualizedIncome > 0 ? Math.round((annualizedIncome * 0.3) / 4) : 0;
      const safeHarbor = inputs.prior_year_tax > 0
        ? Math.round((inputs.prior_year_tax * (annualizedIncome > 150000 ? 1.1 : 1.0)) / 4)
        : 0;

      return (
        <div className="space-y-3">
          {/* Countdown */}
          {next && !next.isPast && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10">
              <div>
                <p className="text-sm font-medium text-foreground">{next.label}</p>
                <p className="text-xs text-muted-foreground">Next deadline</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{next.daysUntil}</p>
                <p className="text-xs text-muted-foreground">days</p>
              </div>
            </div>
          )}

          {/* Payment amounts */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <p className="text-xs text-muted-foreground">Recommended payment</p>
              <p className="text-lg font-bold text-foreground">${quarterlyPayment.toLocaleString()}</p>
              <p className="text-[11px] text-muted-foreground">Based on est. annual tax ÷ 4</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <p className="text-xs text-muted-foreground">Safe harbor</p>
              <p className="text-lg font-bold text-foreground">{safeHarbor > 0 ? `$${safeHarbor.toLocaleString()}` : '—'}</p>
              <p className="text-[11px] text-muted-foreground">
                {safeHarbor > 0 ? `${annualizedIncome > 150000 ? '110' : '100'}% of prior year ÷ 4` : 'Enter prior year tax below'}
              </p>
            </div>
          </div>

          {/* Prior year tax input */}
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground flex-1">Prior year total tax</p>
            <div className="relative w-28">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                type="number"
                value={inputs.prior_year_tax || ''}
                placeholder="0"
                onChange={e => onUpdate({ prior_year_tax: parseFloat(e.target.value) || 0 })}
                className="pl-6 h-8 text-sm"
              />
            </div>
          </div>

          {/* All deadlines */}
          <div className="space-y-1">
            {deadlines.map(d => (
              <div key={d.quarter} className={`flex items-center justify-between text-sm px-2 py-1.5 rounded ${d.isPast ? 'text-muted-foreground' : 'text-foreground'}`}>
                <span>{d.label}</span>
                <span className={`text-xs ${d.isPast ? 'text-muted-foreground' : d.daysUntil <= 30 ? 'text-amber-500 font-medium' : 'text-muted-foreground'}`}>
                  {d.isPast ? 'Past' : `${d.daysUntil} days`}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}
