import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, CalendarPlus, Sparkles, ArrowRight, Check } from 'lucide-react';

interface Props {
  facilityCount: number;
  shiftCount: number;
  draftInvoiceCount: number;
  projectedGross: number;
  onAddAnotherClinic: () => void;
  onAddMoreShifts: () => void;
  onDone: () => void;
}

const fmtMoney = (n: number) =>
  `$${Math.round(n).toLocaleString()}`;

export function OnboardingLoopChoice({
  facilityCount,
  shiftCount,
  draftInvoiceCount,
  projectedGross,
  onAddAnotherClinic,
  onAddMoreShifts,
  onDone,
}: Props) {
  return (
    <div className="space-y-5">
      {/* Compact success summary */}
      <Card className="border-primary/30 bg-primary/[0.04]">
        <CardContent className="py-4 px-4">
          <div className="flex items-center gap-2 mb-3">
            <Check className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium text-foreground">Your workspace is taking shape</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryStat label={`Clinic${facilityCount === 1 ? '' : 's'}`} value={facilityCount.toString()} />
            <SummaryStat label={`Shift${shiftCount === 1 ? '' : 's'}`} value={shiftCount.toString()} />
            <SummaryStat label={`Invoice draft${draftInvoiceCount === 1 ? '' : 's'}`} value={draftInvoiceCount.toString()} />
            <SummaryStat label="Projected gross" value={fmtMoney(projectedGross)} />
          </div>
        </CardContent>
      </Card>

      {/* Headline */}
      <div className="space-y-2 pt-1">
        <h2 className="text-2xl font-bold text-foreground font-[Manrope] leading-tight">
          What would you like to do next?
        </h2>
        <p className="text-muted-foreground text-sm">
          Add more now, or jump in and finish setting up later — your work is saved.
        </p>
      </div>

      {/* Choices */}
      <div className="space-y-2.5">
        <ChoiceButton
          icon={Building2}
          title="Add another clinic"
          subtitle="Set up a second facility with its own rates and contacts."
          onClick={onAddAnotherClinic}
        />
        <ChoiceButton
          icon={CalendarPlus}
          title="Add more shifts here"
          subtitle="Block off more dates at the clinic you just added."
          onClick={onAddMoreShifts}
        />
        <ChoiceButton
          icon={Sparkles}
          title="I'm done — show me around"
          subtitle="See the full picture of how Locum Ops runs your business."
          onClick={onDone}
          primary
        />
      </div>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-lg font-bold text-foreground tabular-nums leading-tight">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
    </div>
  );
}

function ChoiceButton({
  icon: Icon,
  title,
  subtitle,
  onClick,
  primary = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        primary
          ? 'w-full text-left rounded-lg border border-primary/40 bg-primary/[0.06] hover:bg-primary/[0.10] transition-colors px-4 py-3.5 flex items-center gap-3'
          : 'w-full text-left rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors px-4 py-3.5 flex items-center gap-3'
      }
    >
      <div
        className={
          primary
            ? 'h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0'
            : 'h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0'
        }
      >
        <Icon className={primary ? 'h-4.5 w-4.5 text-primary' : 'h-4.5 w-4.5 text-foreground'} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground text-[15px] leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      <ArrowRight className={primary ? 'h-4 w-4 text-primary shrink-0' : 'h-4 w-4 text-muted-foreground shrink-0'} />
    </button>
  );
}
