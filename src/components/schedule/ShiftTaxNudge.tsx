import { PiggyBank, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getShiftTaxNudge } from '@/lib/taxNudge';
import type { TaxIntelligenceProfile } from '@/hooks/useTaxIntelligence';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  shiftIncome: number;
  taxProfile: TaxIntelligenceProfile | null;
  hasProfile: boolean;
  isPaid: boolean;
  effectiveRate: number;
}

export function ShiftTaxNudge({ shiftIncome, taxProfile, hasProfile, isPaid, effectiveRate }: Props) {
  // Only show on paid shifts
  if (!isPaid) return null;
  // Don't show on $0 shifts
  if (shiftIncome <= 0) return null;

  // No profile — show setup CTA
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

  const nudge = getShiftTaxNudge(shiftIncome, effectiveRate);

  return (
    <div className="flex items-center gap-2 text-[13px] py-1">
      <PiggyBank className="h-4 w-4 shrink-0 text-muted-foreground" />
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <span className="text-[hsl(var(--warning))]">Set aside ${nudge.setAsideAmount.toLocaleString()} for taxes</span>
            <span className="text-muted-foreground mx-1">·</span>
            <span className="text-foreground">Keep ${nudge.netAfterSetAside.toLocaleString()} — that's yours</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          Based on your estimated {nudge.effectiveRatePct}% effective tax rate
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
