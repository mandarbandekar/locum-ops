import { Card, CardContent } from '@/components/ui/card';
import { FileText, Building2, Calendar, DollarSign } from 'lucide-react';
import type { Facility } from '@/types';
import { useData } from '@/contexts/DataContext';
import { useMemo } from 'react';

interface Props {
  facility: Facility | null;
  sessionShiftIds: string[];
}

export function OnboardingInvoiceRevealStub({ facility, sessionShiftIds }: Props) {
  const { shifts } = useData();

  const sessionShifts = useMemo(
    () => shifts.filter(s => sessionShiftIds.includes(s.id)),
    [shifts, sessionShiftIds],
  );
  const projected = sessionShifts.reduce((sum, s) => sum + (s.rate_applied || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground font-[Manrope]">
            We're preparing your first invoice previews
          </h2>
        </div>
      </div>

      <p className="text-muted-foreground">
        Locum Ops auto-drafts invoices from your shifts. Coming up next, you'll see how this works.
      </p>

      <Card>
        <CardContent className="pt-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Your setup so far
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <Building2 className="h-3.5 w-3.5" />
                <span className="text-[11px] uppercase tracking-wider font-semibold">Clinic</span>
              </div>
              <p className="text-sm font-bold text-foreground truncate">
                {facility?.name ?? '—'}
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <Calendar className="h-3.5 w-3.5" />
                <span className="text-[11px] uppercase tracking-wider font-semibold">Shifts</span>
              </div>
              <p className="text-sm font-bold text-foreground tabular-nums">
                {sessionShifts.length}
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <DollarSign className="h-3.5 w-3.5" />
                <span className="text-[11px] uppercase tracking-wider font-semibold">Projected</span>
              </div>
              <p className="text-sm font-bold text-foreground tabular-nums">
                ${projected.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Your draft invoices will be ready for review on your dashboard.
      </p>
    </div>
  );
}
