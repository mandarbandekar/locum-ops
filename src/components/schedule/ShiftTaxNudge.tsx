import { PiggyBank, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getShiftTaxNudge } from '@/lib/taxNudge';
import type { TaxIntelligenceProfile } from '@/hooks/useTaxIntelligence';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { STATE_TAX_DATA } from '@/lib/stateTaxData';

interface Props {
  shiftIncome: number;
  taxProfile: TaxIntelligenceProfile | null;
  hasProfile: boolean;
  isPaid: boolean;
  effectiveRate: number;
  breakdown?: { federal: number; state: number; se: number };
}

function formatStateAllocation(profile: TaxIntelligenceProfile): string | null {
  const work = (profile.work_states || []).filter(w => w.income_pct > 0);
  if (work.length === 0) return null;
  const residentPct = Math.max(0, 100 - work.reduce((s, w) => s + w.income_pct, 0));
  const residentName = STATE_TAX_DATA[profile.state_code]?.name || profile.state_code;
  const parts: string[] = [];
  if (residentPct > 0) parts.push(`${residentName} ${Math.round(residentPct)}%`);
  for (const w of work) {
    const name = STATE_TAX_DATA[w.state_code]?.name || w.state_code;
    parts.push(`${name} ${Math.round(w.income_pct)}%`);
  }
  return parts.join(' · ');
}

export function ShiftTaxNudge({ shiftIncome, taxProfile, hasProfile, isPaid, effectiveRate, breakdown }: Props) {
  if (!isPaid) return null;
  if (shiftIncome <= 0) return null;

  if (!hasProfile || !taxProfile) {
    return (
      <div className="flex items-center gap-2 text-[13px] text-muted-foreground py-1">
        <Lock className="h-4 w-4 shrink-0" />
        <span>
          Set up your tax profile to see how much to save from each shift{' '}
          <Link to="/tax-center" className="text-primary hover:underline font-medium">
            Complete setup →
          </Link>
        </span>
      </div>
    );
  }

  const isScorp = taxProfile.entity_type === 'scorp';
  const nudge = getShiftTaxNudge(shiftIncome, effectiveRate, breakdown);
  const bd = nudge.breakdown;
  const stateAllocation = formatStateAllocation(taxProfile);

  const tooltipLines: string[] = [];
  if (bd.federal > 0) tooltipLines.push(`Federal income tax (${Math.round(bd.federal * 100)}% marginal): $${Math.round(shiftIncome * bd.federal).toLocaleString()}`);
  if (bd.state > 0) tooltipLines.push(`State tax (${(bd.state * 100).toFixed(1)}% blended): $${Math.round(shiftIncome * bd.state).toLocaleString()}`);
  if (bd.se > 0) tooltipLines.push(`SE tax (${(bd.se * 100).toFixed(1)}%): $${Math.round(shiftIncome * bd.se).toLocaleString()}`);
  tooltipLines.push(`Total set aside (${nudge.effectiveRatePct}% effective): $${nudge.setAsideAmount.toLocaleString()}`);
  if (stateAllocation) tooltipLines.push(`Income split: ${stateAllocation}`);
  if (isScorp) tooltipLines.push('Payroll taxes on your salary are handled through your payroll provider.');

  return (
    <div className="flex items-center gap-2 text-[13px] py-1">
      <PiggyBank className="h-4 w-4 shrink-0 text-muted-foreground" />
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <span className="text-[hsl(var(--warning))]">
              Set aside ${nudge.setAsideAmount.toLocaleString()} for {isScorp ? 'income tax' : 'taxes'}
            </span>
            <span className="text-muted-foreground mx-1">·</span>
            <span className="text-foreground">Keep ${nudge.netAfterSetAside.toLocaleString()} — that's yours</span>
            {stateAllocation && (
              <>
                <span className="text-muted-foreground mx-1">·</span>
                <span className="text-muted-foreground text-[12px]">multi-state</span>
              </>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-xs whitespace-pre-line">
          {tooltipLines.join('\n')}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

interface SummaryProps {
  ytdPaid: number;
  effectiveRate: number;
  hasProfile: boolean;
}

export function ShiftTaxSummaryFooter({ ytdPaid, effectiveRate, hasProfile }: SummaryProps) {
  if (!hasProfile || ytdPaid <= 0) return null;
  const setAside = Math.round(ytdPaid * effectiveRate);
  const pct = Math.round(effectiveRate * 100);
  return (
    <div className="text-[13px] text-muted-foreground px-3 py-2">
      Year-to-date paid: ${ytdPaid.toLocaleString()} · Recommended set-aside: ${setAside.toLocaleString()} ({pct}% of income)
    </div>
  );
}
