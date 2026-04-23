import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, FileText, Calendar, Building2, Mail } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import type { Facility, Invoice, InvoiceLineItem } from '@/types';

interface Props {
  facility: Facility | null;
  /** Shift IDs created during this onboarding session — used to scope invoice cards. */
  sessionShiftIds: string[];
}

/** Format YYYY-MM-DD or ISO without timezone shifting. */
function fmtDate(s: string | null | undefined): string {
  if (!s) return '—';
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${MONTHS[+m[2] - 1]} ${+m[3]}, ${m[1]}`;
  const d = new Date(s);
  if (isNaN(d.getTime())) return '—';
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function fmtMoney(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

interface DerivedCard {
  invoice: Invoice;
  facilityName: string;
  shiftCount: number;
  periodLabel: string;
  total: number;
  status: 'Draft' | 'Upcoming' | 'Sent' | 'Paid';
  dueDate: string | null;
  items: InvoiceLineItem[];
}

export function OnboardingInvoiceReveal({ facility, sessionShiftIds }: Props) {
  const { invoices, lineItems, facilities } = useData();

  const cards: DerivedCard[] = useMemo(() => {
    if (sessionShiftIds.length === 0) return [];
    const sessionSet = new Set(sessionShiftIds);

    // Find every invoice that contains at least one of our session shifts.
    const matching = invoices.filter(inv => {
      const items = lineItems.filter(li => li.invoice_id === inv.id);
      return items.some(li => li.shift_id && sessionSet.has(li.shift_id));
    });

    // Map → derived card data.
    const derived: DerivedCard[] = matching.map(inv => {
      const items = lineItems.filter(li => li.invoice_id === inv.id);
      const shiftItems = items.filter(li => li.shift_id);
      const fac = facilities.find(f => f.id === inv.facility_id);
      const status: DerivedCard['status'] =
        inv.status === 'paid' ? 'Paid'
        : inv.status === 'sent' || inv.status === 'partial' ? 'Sent'
        : inv.status === 'draft' ? 'Draft'
        : 'Upcoming';

      const periodLabel = inv.period_start && inv.period_end
        ? `${fmtDate(inv.period_start)} – ${fmtDate(inv.period_end)}`
        : fmtDate(inv.invoice_date);

      return {
        invoice: inv,
        facilityName: fac?.name ?? facility?.name ?? 'Your clinic',
        shiftCount: shiftItems.length,
        periodLabel,
        total: inv.total_amount || 0,
        status,
        dueDate: inv.due_date ?? null,
        items,
      };
    });

    // Sort: most recent invoice_date first; cap at 3.
    derived.sort((a, b) => (b.invoice.invoice_date || '').localeCompare(a.invoice.invoice_date || ''));
    return derived.slice(0, 3);
  }, [invoices, lineItems, facilities, sessionShiftIds, facility]);

  const totalProjected = useMemo(
    () => cards.reduce((sum, c) => sum + c.total, 0),
    [cards],
  );

  return (
    <div className="space-y-5">
      {/* Top banner */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground font-[Manrope] leading-tight">
            Your invoices are already being prepared for you
          </h2>
        </div>
        <p className="text-muted-foreground">
          Based on your scheduled shifts, Locum Ops creates invoice drafts for you automatically.
        </p>
      </div>

      {/* Invoice cards */}
      {cards.length > 0 ? (
        <div className="space-y-3">
          {cards.map(card => (
            <InvoicePreviewCard key={card.invoice.id} card={card} />
          ))}
          {cards.length > 1 && (
            <p className="text-xs text-muted-foreground text-center pt-1">
              {cards.length} draft invoice{cards.length === 1 ? '' : 's'} · {fmtMoney(totalProjected)} total
            </p>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            We'll show your draft invoices here once your first shifts are saved.
          </CardContent>
        </Card>
      )}

      {/* Reminder copy */}
      <Card className="border-primary/20 bg-primary/[0.04]">
        <CardContent className="py-4 px-4 space-y-2">
          <div className="flex items-start gap-2.5">
            <Mail className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-foreground">
              <span className="font-medium">You'll get reminders when invoices are ready for review.</span>{' '}
              Open them, double-check, and send them directly from Locum Ops.
            </p>
          </div>
          <p className="text-xs text-muted-foreground pl-6">
            No spreadsheet chasing. No rebuilding invoices by hand.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────── Compact card ───────────────────────────

function InvoicePreviewCard({ card }: { card: DerivedCard }) {
  const statusStyle: Record<DerivedCard['status'], string> = {
    Draft: 'border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400',
    Upcoming: 'border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400',
    Sent: 'border-primary/40 text-primary bg-primary/[0.06]',
    Paid: 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400',
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Header strip */}
        <div className="px-4 py-3 border-b border-border/60 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] uppercase tracking-wider font-semibold mb-0.5">
              <FileText className="h-3 w-3" /> Invoice {card.invoice.invoice_number}
            </div>
            <p className="font-semibold text-foreground text-base flex items-center gap-1.5 truncate">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate">{card.facilityName}</span>
            </p>
          </div>
          <Badge variant="outline" className={statusStyle[card.status]}>
            {card.status}
          </Badge>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-2.5">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>{card.periodLabel}</span>
            <span className="text-border">·</span>
            <span>{card.shiftCount} shift{card.shiftCount === 1 ? '' : 's'}</span>
          </div>

          {/* Embedded line-item preview (first 3) */}
          {card.items.length > 0 && (
            <div className="rounded-md border border-border/50 bg-muted/30 divide-y divide-border/40">
              {card.items.slice(0, 3).map(li => (
                <div key={li.id} className="px-3 py-2 flex items-center justify-between gap-3 text-xs">
                  <span className="text-muted-foreground truncate">{li.description}</span>
                  <span className="font-semibold text-foreground tabular-nums shrink-0">
                    {fmtMoney(li.line_total)}
                  </span>
                </div>
              ))}
              {card.items.length > 3 && (
                <div className="px-3 py-1.5 text-[11px] text-muted-foreground text-center">
                  +{card.items.length - 3} more line{card.items.length - 3 === 1 ? '' : 's'}
                </div>
              )}
            </div>
          )}

          {/* Total + due */}
          <div className="flex items-end justify-between pt-1">
            <div className="text-xs text-muted-foreground">
              {card.dueDate ? <>Due {fmtDate(card.dueDate)}</> : 'Auto-drafted'}
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total</div>
              <div className="text-lg font-bold text-foreground tabular-nums leading-none">
                {fmtMoney(card.total)}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
