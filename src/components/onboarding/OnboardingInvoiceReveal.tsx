import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, FileText, Send, CheckCircle2, ClipboardList } from 'lucide-react';
import { InvoicePreview } from '@/components/invoice/InvoicePreview';
import type { Facility, Invoice, InvoiceLineItem, Shift } from '@/types';

interface Props {
  facilities: Facility[];
  invoices: Invoice[];
  lineItems: InvoiceLineItem[];
  shifts: Shift[];
  /** Shift ids added during this onboarding session — used to find the right draft. */
  sessionShiftIds: string[];
  sender: {
    firstName: string;
    lastName: string;
    company: string;
    address: string;
    email?: string | null;
    phone?: string | null;
  };
}

export function OnboardingInvoiceReveal({
  facilities,
  invoices,
  lineItems,
  shifts,
  sessionShiftIds,
  sender,
}: Props) {
  // Find the draft invoice that contains any of our session shifts.
  const draft = useMemo(() => {
    const candidates = invoices.filter(i => i.status === 'draft');
    for (const inv of candidates) {
      const items = lineItems.filter(li => li.invoice_id === inv.id);
      if (items.some(li => li.shift_id && sessionShiftIds.includes(li.shift_id))) {
        return inv;
      }
    }
    // Fallback: most recent draft for any facility we used.
    const usedFacilityIds = new Set(
      shifts.filter(s => sessionShiftIds.includes(s.id)).map(s => s.facility_id),
    );
    return candidates
      .filter(i => usedFacilityIds.has(i.facility_id))
      .sort((a, b) => b.invoice_date.localeCompare(a.invoice_date))[0];
  }, [invoices, lineItems, shifts, sessionShiftIds]);

  const draftItems = useMemo(
    () => (draft ? lineItems.filter(li => li.invoice_id === draft.id) : []),
    [draft, lineItems],
  );

  const facility = draft ? facilities.find(f => f.id === draft.facility_id) : undefined;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold text-foreground font-[Manrope]">
            Your first invoice is ready
          </h2>
        </div>
        <p className="text-muted-foreground">
          Every shift you logged just became a billable line. We drafted this for you — review,
          customize, and send when you're ready.
        </p>
      </div>

      {/* Live invoice preview */}
      {draft && facility ? (
        <div className="animate-slide-up" style={{ animationFillMode: 'both' }}>
          <InvoicePreview
            sender={sender}
            billTo={{
              facilityName: facility.name,
              contactName: facility.invoice_name_to,
              email: facility.invoice_email_to,
              address: facility.address,
            }}
            invoiceNumber={draft.invoice_number}
            invoiceDate={draft.invoice_date}
            dueDate={draft.due_date}
            lineItems={draftItems.map(li => ({
              description: li.description,
              service_date: li.service_date,
              qty: li.qty,
              unit_rate: li.unit_rate,
              line_total: li.line_total,
              shift_id: li.shift_id,
              line_kind: li.line_kind,
            }))}
            total={draft.total_amount}
            balanceDue={draft.balance_due}
            notes={draft.notes}
          />
          <div className="flex items-center justify-center gap-2 mt-3">
            <Badge variant="outline" className="border-amber-300 text-amber-600 bg-amber-50 dark:bg-amber-950/30">
              Draft saved to your account
            </Badge>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            We'll show the live draft as soon as your first shift is logged.
          </CardContent>
        </Card>
      )}

      {/* How this works */}
      <Card
        className="border-primary/20 bg-primary/[0.03] animate-slide-up"
        style={{ animationDelay: '200ms', animationFillMode: 'both' }}
      >
        <CardContent className="py-4 px-4 space-y-3">
          <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            ✨ How this works going forward
          </p>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            <li className="flex items-start gap-2.5">
              <ClipboardList className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span><span className="font-medium text-foreground">You log shifts</span> — date, time, and rate per clinic.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span><span className="font-medium text-foreground">We draft invoices</span> — every shift adds a line to the open invoice for that clinic.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Send className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span><span className="font-medium text-foreground">You review & send</span> — one click to email the clinic.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span><span className="font-medium text-foreground">We track payment</span> — reminders go out automatically until it's paid.</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
