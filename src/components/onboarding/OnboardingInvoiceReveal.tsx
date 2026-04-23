import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Mail } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { InvoicePreview } from '@/components/invoice/InvoicePreview';
import type { Facility, Invoice, InvoiceLineItem } from '@/types';

interface Props {
  facility: Facility | null;
  /** Shift IDs created during this onboarding session — used to scope invoice cards. */
  sessionShiftIds: string[];
}

interface DerivedCard {
  invoice: Invoice;
  facility: Facility | null;
  status: 'Draft' | 'Upcoming' | 'Sent' | 'Paid';
  items: InvoiceLineItem[];
}

export function OnboardingInvoiceReveal({ facility, sessionShiftIds }: Props) {
  const { invoices, lineItems, facilities } = useData();
  const { profile } = useUserProfile();

  const cards: DerivedCard[] = useMemo(() => {
    if (sessionShiftIds.length === 0) return [];
    const sessionSet = new Set(sessionShiftIds);

    const matching = invoices.filter(inv => {
      const items = lineItems.filter(li => li.invoice_id === inv.id);
      return items.some(li => li.shift_id && sessionSet.has(li.shift_id));
    });

    const derived: DerivedCard[] = matching.map(inv => {
      const items = lineItems.filter(li => li.invoice_id === inv.id);
      const fac = facilities.find(f => f.id === inv.facility_id) ?? facility ?? null;
      const status: DerivedCard['status'] =
        inv.status === 'paid' ? 'Paid'
        : inv.status === 'sent' || inv.status === 'partial' ? 'Sent'
        : inv.status === 'draft' ? 'Draft'
        : 'Upcoming';
      return { invoice: inv, facility: fac, status, items };
    });

    derived.sort((a, b) => (b.invoice.invoice_date || '').localeCompare(a.invoice.invoice_date || ''));
    return derived.slice(0, 3);
  }, [invoices, lineItems, facilities, sessionShiftIds, facility]);

  const statusStyle: Record<DerivedCard['status'], string> = {
    Draft: 'border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400',
    Upcoming: 'border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400',
    Sent: 'border-primary/40 text-primary bg-primary/[0.06]',
    Paid: 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400',
  };

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

      {/* Real invoice previews */}
      {cards.length > 0 ? (
        <div className="space-y-4">
          {cards.map(card => {
            const fac = card.facility;
            return (
              <div key={card.invoice.id} className="rounded-lg border border-border bg-card overflow-hidden">
                {/* Status header strip */}
                <div className="px-4 py-2.5 border-b border-border/60 bg-muted/30 flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-foreground truncate">
                    Invoice {card.invoice.invoice_number}
                    {fac?.name && (
                      <span className="text-muted-foreground"> · {fac.name}</span>
                    )}
                  </div>
                  <Badge variant="outline" className={statusStyle[card.status]}>
                    {card.status}
                  </Badge>
                </div>

                {/* Real InvoicePreview — same as in-app */}
                <InvoicePreview
                  sender={{
                    firstName: profile?.first_name || '',
                    lastName: profile?.last_name || '',
                    company: profile?.company_name || '',
                    address: profile?.company_address || '',
                    email: profile?.invoice_email,
                    phone: profile?.invoice_phone,
                  }}
                  billTo={{
                    facilityName: fac?.name || 'Your clinic',
                    contactName: fac?.invoice_name_to || undefined,
                    email: fac?.invoice_email_to || undefined,
                    address: fac?.address || undefined,
                  }}
                  invoiceNumber={card.invoice.invoice_number}
                  invoiceDate={card.invoice.invoice_date}
                  dueDate={card.invoice.due_date ?? null}
                  lineItems={card.items}
                  total={card.invoice.total_amount || 0}
                  balanceDue={card.invoice.balance_due ?? card.invoice.total_amount ?? 0}
                  notes={card.invoice.notes || ''}
                />
              </div>
            );
          })}
          {cards.length > 1 && (
            <p className="text-xs text-muted-foreground text-center pt-1">
              {cards.length} draft invoice{cards.length === 1 ? '' : 's'} ready for review
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
