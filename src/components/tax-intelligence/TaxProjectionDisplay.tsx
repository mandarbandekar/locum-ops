import { useMemo, useState } from 'react';
import { ChevronDown, Info, Lightbulb } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { calculate1099Tax, calculateSCorpTax, type TaxProfileV1, type Tax1099Result } from '@/lib/taxCalculatorV1';
import { STATE_TAX_DATA } from '@/lib/stateTaxData';

// ── Schedule options ────────────────────────────────
export const SCHEDULE_OPTIONS = [
  { label: '1–2', sub: 'days/wk', daysPerYear: 75 },
  { label: '3', sub: 'days/wk', daysPerYear: 144 },
  { label: '4', sub: 'days/wk', daysPerYear: 192 },
  { label: '5+', sub: 'days/wk', daysPerYear: 240 },
] as const;

export function daysPerWeekToIndex(d: number): number {
  if (d <= 2) return 0;
  if (d === 3) return 1;
  if (d === 4) return 2;
  return 3;
}

export function indexToDaysPerWeek(i: number): number {
  return [2, 3, 4, 5][i] ?? 3;
}

function getStateFromTimezone(tz: string): { code: string; name: string } {
  const map: Record<string, { code: string; name: string }> = {
    'America/New_York': { code: 'NY', name: 'New York' },
    'America/Chicago': { code: 'IL', name: 'Illinois' },
    'America/Denver': { code: 'CO', name: 'Colorado' },
    'America/Phoenix': { code: 'AZ', name: 'Arizona' },
    'America/Los_Angeles': { code: 'CA', name: 'California' },
    'America/Anchorage': { code: 'AK', name: 'Alaska' },
    'Pacific/Honolulu': { code: 'HI', name: 'Hawaii' },
  };
  return map[tz] || { code: 'CA', name: 'California' };
}

function fmt(n: number) {
  return Math.round(n).toLocaleString('en-US');
}

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center justify-center h-4 w-4 rounded-full border border-muted-foreground/30 text-[10px] text-muted-foreground cursor-help ml-1 shrink-0">
          ?
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[280px] text-xs">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

interface Props {
  dayRate: number;
  timezone: string;
  stateCode?: string;
  selectedScheduleIndex: number;
  onScheduleChange: (index: number) => void;
  defaultExpanded?: boolean;
  variant?: 'onboarding' | 'page';
  entityType?: '1099' | 'scorp';
  scorpSalary?: number;
  filingStatus?: string;
  spouseW2Income?: number;
  retirementContributions?: number;
  annualBusinessExpenses?: number;
}

export default function TaxProjectionDisplay({
  dayRate,
  timezone,
  stateCode: stateCodeProp,
  selectedScheduleIndex,
  onScheduleChange,
  defaultExpanded = false,
  variant = 'onboarding',
  entityType = '1099',
  scorpSalary,
  filingStatus,
  spouseW2Income,
  retirementContributions,
  annualBusinessExpenses,
}: Props) {
  const [waterfallOpen, setWaterfallOpen] = useState(defaultExpanded);

  const detectedState = getStateFromTimezone(timezone);
  const stateCode = stateCodeProp || detectedState.code;
  const stateName = STATE_TAX_DATA[stateCode]?.name || detectedState.name;

  const schedule = SCHEDULE_OPTIONS[selectedScheduleIndex] ?? SCHEDULE_OPTIONS[1];
  const daysPerYear = schedule.daysPerYear;
  const daysPerQuarter = Math.round(daysPerYear / 4);

  const { taxResult, scorpSavings, isScorp } = useMemo(() => {
    const annualIncome = dayRate * daysPerYear;
    const profile: TaxProfileV1 = {
      entityType: entityType,
      annualReliefIncome: annualIncome,
      scorpSalary: entityType === 'scorp' ? (scorpSalary || Math.round(annualIncome * 0.4)) : 0,
      extraWithholding: 0,
      payPeriodsPerYear: 24,
      filingStatus: filingStatus || 'single',
      spouseW2Income: spouseW2Income || 0,
      retirementContributions: retirementContributions || 0,
      annualBusinessExpenses: annualBusinessExpenses || 0,
      stateKey: stateCode,
    };

    if (entityType === 'scorp') {
      const scorpResult = calculateSCorpTax(profile);
      return { taxResult: scorpResult as any, scorpSavings: 0, isScorp: true };
    }

    const result = calculate1099Tax(profile);

    // S-Corp savings estimate
    const scorpProfile: TaxProfileV1 = {
      ...profile,
      entityType: 'scorp',
      scorpSalary: Math.round(annualIncome * 0.4),
    };
    const scorpResult = calculateSCorpTax(scorpProfile);
    const sole1099Annual = result.annualEstimatedTaxDue;
    const scorpAnnual = scorpResult.annualEstimatedTaxDue + scorpResult.totalAlreadyWithheld;
    const savings = Math.max(0, Math.round((sole1099Annual - scorpAnnual) / 4));

    return { taxResult: result, scorpSavings: savings, isScorp: false };
  }, [dayRate, daysPerYear, stateCode, entityType, scorpSalary, filingStatus, spouseW2Income, retirementContributions, annualBusinessExpenses]);

  // Derive quarterly numbers based on entity type
  const quarterlyIncome = Math.round((dayRate * daysPerYear) / 4);
  let quarterlyFederal: number;
  let quarterlySE: number;
  let quarterlyState: number;
  let quarterlyEmployerFica: number = 0;

  if (isScorp) {
    const sr = taxResult as any;
    quarterlyFederal = Math.round((sr.totalFederalTax || 0) / 4);
    quarterlySE = 0;
    quarterlyEmployerFica = Math.round((sr.employerFica || 0) / 4);
    quarterlyState = Math.round((sr.stateTax || 0) / 4);
  } else {
    const r = taxResult as Tax1099Result;
    quarterlyFederal = Math.round(r.vetFederalShare / 4);
    quarterlySE = Math.round(r.totalSeTax / 4);
    quarterlyState = Math.round(r.stateTax / 4);
  }
  const quarterlyTax = quarterlyFederal + quarterlySE + quarterlyState + quarterlyEmployerFica;
  const quarterlyTakeHome = quarterlyIncome - quarterlyTax;

  const showTimezoneNote = !stateCodeProp;

  return (
    <div className="space-y-4">
      {/* ═══ SECTION 1: SCHEDULE SELECTOR ═══ */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">How often do you work relief?</p>
        <div className="grid grid-cols-4 gap-2">
          {SCHEDULE_OPTIONS.map((opt, i) => {
            const selected = i === selectedScheduleIndex;
            return (
              <button
                key={i}
                type="button"
                onClick={() => onScheduleChange(i)}
                className={`rounded-[10px] py-3 px-2 text-center transition-all duration-150 border ${
                  selected
                    ? 'bg-emerald-500/15 border-emerald-500/60 dark:bg-emerald-500/10 dark:border-emerald-500/40'
                    : 'bg-card border-border hover:border-muted-foreground/40'
                }`}
              >
                <p className={`text-lg font-bold tabular-nums ${selected ? 'text-emerald-500' : 'text-foreground'}`}>
                  {opt.label}
                </p>
                <p className={`text-[11px] ${selected ? 'text-emerald-500/80' : 'text-muted-foreground'}`}>
                  {opt.sub}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ SECTION 2: THREE HERO NUMBERS ═══ */}
      <div className="rounded-[14px] overflow-hidden border border-border flex">
        {/* Quarterly Income */}
        <div className="flex-1 p-3 text-center border-r border-border">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Quarterly Income</p>
          <p className="text-xl font-semibold text-muted-foreground tabular-nums">${fmt(quarterlyIncome)}</p>
        </div>
        {/* Est. Taxes */}
        <div className="flex-1 p-3 text-center border-r border-border">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Est. Taxes</p>
          <p className="text-xl font-semibold text-amber-500 tabular-nums">${fmt(quarterlyTax)}</p>
        </div>
        {/* Est. Take-Home */}
        <div className="flex-[1.3] p-3 text-center bg-emerald-500/[0.06] dark:bg-emerald-500/[0.04]">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Est. Take-Home</p>
          <p className="text-2xl font-bold text-emerald-500 tabular-nums">${fmt(quarterlyTakeHome)}</p>
        </div>
      </div>

      {/* ═══ SECTION 3: EXPANDABLE WATERFALL ═══ */}
      <Collapsible open={waterfallOpen} onOpenChange={setWaterfallOpen}>
        <CollapsibleTrigger className={`flex items-center justify-between w-full px-4 py-3 text-left border border-border bg-card transition-all ${
          waterfallOpen ? 'rounded-t-[14px] rounded-b-none border-b-0' : 'rounded-[14px]'
        }`}>
          <span className="text-sm font-medium text-foreground">
            How we get to ${fmt(quarterlyTakeHome)}/quarter
          </span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${waterfallOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="border border-t-0 border-border rounded-b-[14px] bg-card px-4 pb-4">
          {/* YOUR INPUTS */}
          <div className="flex items-center gap-2 pt-3 pb-2">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Your Inputs</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <WaterfallRow label="Day rate" value={`$${fmt(dayRate)}`} />
          <WaterfallRow
            label={`× ${daysPerQuarter} shift-days/quarter`}
            value={`$${fmt(quarterlyIncome)}`}
            tip={`${schedule.label} days/wk × ~48 weeks/yr ÷ 4 quarters = ${daysPerQuarter} days/quarter`}
          />

          {/* QUARTERLY TAXES */}
          <div className="flex items-center gap-2 pt-4 pb-2">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Quarterly Taxes</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <WaterfallRow
            label="− Federal income tax"
            value={`−$${fmt(quarterlyFederal)}`}
            negative
            tip="Calculated using 2025 federal progressive brackets on your projected annual taxable income."
          />
          {isScorp ? (
            <WaterfallRow
              label="− Payroll taxes (employer FICA)"
              value={`−$${fmt(quarterlyEmployerFica)}`}
              negative
              tip="As an S-Corp, you pay employer-side FICA (7.65%) on your reasonable salary instead of full 15.3% SE tax on all net income."
            />
          ) : (
            <WaterfallRow
              label="− Self-employment tax"
              value={`−$${fmt(quarterlySE)}`}
              negative
              tip="15.3% on 92.35% of net income — covers Social Security (12.4%) and Medicare (2.9%)."
            />
          )}
          {quarterlyState > 0 && (
            <WaterfallRow
              label={`− ${stateName} state tax`}
              value={`−$${fmt(quarterlyState)}`}
              negative
              tip={`Estimated using ${stateName} state income tax brackets.${showTimezoneNote ? ' Based on your timezone location.' : ''}`}
            />
          )}

          {/* RESULT */}
          <div className="flex items-center gap-2 pt-4 pb-2">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Result</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="rounded-lg bg-emerald-500/[0.08] dark:bg-emerald-500/[0.05] border border-emerald-500/20 px-3 py-2.5 flex justify-between items-center">
            <span className="text-sm font-semibold text-emerald-500">= Estimated take-home</span>
            <span className="text-sm font-bold text-emerald-500 tabular-nums">${fmt(quarterlyTakeHome)}</span>
          </div>

          {/* EXPENSE DISCLAIMER */}
          <div className="rounded-lg bg-muted/50 px-3 py-2.5 mt-3">
            <p className="text-xs text-muted-foreground">
              These estimates don't account for business expenses, retirement contributions, or other deductions — your actual tax bill will likely be lower. A CPA can help you optimize.
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* ═══ SECTION 4: S-CORP CALLOUT (only for 1099 users) ═══ */}
      {!isScorp && scorpSavings > 0 && (
        <div className="flex items-start gap-3 rounded-[14px] border border-border bg-card px-4 py-3">
          <Lightbulb className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">
              At your current rate, an S-Corp election could save you ~${fmt(scorpSavings)}/quarter.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Your Tax Center tracks whether an S-Corp structure could reduce your self-employment tax — review it anytime.
            </p>
          </div>
        </div>
      )}

      {/* ═══ SECTION 5: STATIC DISCLAIMER ═══ */}
      <p className="text-xs text-muted-foreground">
        These estimates are based on standard self-employment tax rates and federal/state brackets. LocumOps does not provide tax, legal, or financial advice. We recommend consulting a CPA for your specific situation.
      </p>

      {showTimezoneNote && quarterlyState > 0 && (
        <p className="text-[11px] text-muted-foreground">
          State tax estimated for {stateName} based on your timezone. You can update your state in Settings.
        </p>
      )}
    </div>
  );
}

function WaterfallRow({ label, value, negative, tip }: { label: string; value: string; negative?: boolean; tip?: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 text-sm">
      <span className="text-muted-foreground flex items-center">
        {label}
        {tip && <InfoTip text={tip} />}
      </span>
      <span className={`tabular-nums font-medium ${negative ? 'text-red-400' : 'text-foreground'}`}>
        {value}
      </span>
    </div>
  );
}
