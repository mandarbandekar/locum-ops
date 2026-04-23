import { Card, CardContent } from '@/components/ui/card';
import {
  FileText, Receipt, TrendingUp, Calculator, ClipboardCheck, ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

interface Props {
  facilityCount: number;
  shiftCount: number;
  draftInvoiceCount: number;
  projectedGross: number;
}

const fmtMoney = (n: number) => `$${Math.round(n).toLocaleString()}`;

export function OnboardingBusinessMap({
  facilityCount,
  shiftCount,
  draftInvoiceCount,
  projectedGross,
}: Props) {
  const cards: { icon: LucideIcon; title: string; statement: string; accent?: string }[] = [
    {
      icon: FileText,
      title: 'Invoices',
      statement:
        draftInvoiceCount > 0
          ? `${draftInvoiceCount} draft${draftInvoiceCount === 1 ? '' : 's'} ready — auto-built from your shifts`
          : 'Auto-drafted from your shifts',
    },
    {
      icon: Receipt,
      title: 'Expenses & Mileage',
      statement: 'Log deductible work costs as they happen',
    },
    {
      icon: TrendingUp,
      title: 'Real-time Revenue',
      statement:
        projectedGross > 0
          ? `${fmtMoney(projectedGross)} projected from your scheduled shifts`
          : 'See what your schedule is worth',
    },
    {
      icon: Calculator,
      title: 'Estimated Taxes',
      statement: 'Stay ahead of quarterly payments',
    },
    {
      icon: ClipboardCheck,
      title: 'CPA Prep',
      statement: 'Cleaner handoff at tax time',
    },
    {
      icon: ShieldCheck,
      title: 'Credentials & CE',
      statement: 'Track renewals and requirements',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Headline */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground font-[Manrope] leading-tight">
          Locum Ops keeps your relief business organized in one place
        </h2>
        <p className="text-muted-foreground text-sm">
          Here's what's already running for you — and what's waiting once you need it.
        </p>
      </div>

      {/* Center summary — what they've already built */}
      <Card className="border-primary/30 bg-primary/[0.04]">
        <CardContent className="py-4 px-4">
          <div className="text-[11px] uppercase tracking-wider text-primary font-semibold mb-2">
            Your setup so far
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryStat label={`Clinic${facilityCount === 1 ? '' : 's'} added`} value={facilityCount.toString()} />
            <SummaryStat label={`Shift${shiftCount === 1 ? '' : 's'} created`} value={shiftCount.toString()} />
            <SummaryStat label={`Invoice draft${draftInvoiceCount === 1 ? '' : 's'}`} value={draftInvoiceCount.toString()} />
            <SummaryStat label="Projected gross" value={fmtMoney(projectedGross)} />
          </div>
        </CardContent>
      </Card>

      {/* Six value cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {cards.map(card => (
          <ValueCard key={card.title} {...card} />
        ))}
      </div>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-lg font-bold text-foreground tabular-nums leading-tight">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </div>
    </div>
  );
}

function ValueCard({ icon: Icon, title, statement }: { icon: LucideIcon; title: string; statement: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3.5 py-3 flex items-start gap-3">
      <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground text-sm leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{statement}</p>
      </div>
    </div>
  );
}
