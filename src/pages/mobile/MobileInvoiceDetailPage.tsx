import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Pencil, Share2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useData } from "@/contexts/DataContext";
import { MobileStatusChip } from "@/components/mobile/MobileStatusChip";
import { shareInvoicePdf } from "@/lib/mobileInvoiceShare";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function fmtMoney(n: number, opts: { compact?: boolean } = {}) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: opts.compact ? 0 : 2,
    maximumFractionDigits: opts.compact ? 0 : 2,
  }).format(n || 0);
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  try {
    return format(new Date(d), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

export function MobileInvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { invoices, facilities, lineItems, getComputedInvoiceStatus, deleteInvoice } = useData();
  const inv = invoices.find((i) => i.id === id);

  const items = useMemo(
    () => (inv ? lineItems.filter((l) => l.invoice_id === inv.id) : []),
    [lineItems, inv]
  );

  if (!inv) {
    return (
      <div className="p-5">
        <button
          onClick={() => navigate(-1)}
          className="text-[14px] text-[hsl(var(--m-primary))]"
        >
          ‹ Back
        </button>
        <div className="mt-6 text-[14px] text-[hsl(var(--m-text-muted))]">
          Invoice not found.
        </div>
      </div>
    );
  }

  const fac = facilities.find((f) => f.id === inv.facility_id);
  const status = getComputedInvoiceStatus(inv) as string;
  const isPaid = status === "paid";
  const total = inv.total_amount || 0;
  const balance = inv.balance_due ?? total;

  async function onShare() {
    try {
      const result = await shareInvoicePdf({
        invoiceId: inv!.id,
        invoiceNumber: inv!.invoice_number,
        cacheKey: String(inv!.balance_due) + (inv!.paid_at || ""),
        facilityName: fac?.name,
      });
      if (result === "downloaded") toast.success("PDF downloaded");
    } catch {
      toast.error("Failed to share PDF");
    }
  }

  async function onDelete() {
    await deleteInvoice(inv!.id);
    toast.success("Invoice deleted");
    navigate("/invoices");
  }

  return (
    <div className="pb-32">
      {/* Header */}
      <header className="px-4 pt-safe pb-1 flex items-center gap-1">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="h-9 w-9 -ml-2 rounded-full flex items-center justify-center text-[hsl(var(--m-text))]"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-[15px] font-medium truncate flex-1 text-[hsl(var(--m-text-muted))]">
          Invoice {inv.invoice_number}
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              aria-label="Delete invoice"
              className="h-9 w-9 -mr-2 rounded-full flex items-center justify-center text-[hsl(var(--m-text-muted))]"
            >
              <Trash2 className="h-[18px] w-[18px]" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete invoice {inv.invoice_number}?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes the invoice and its line items. This can't be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </header>

      <div className="px-4 mt-1 space-y-3">
        {/* Hero: amount + clinic + status */}
        <section className="mobile-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[12px] uppercase tracking-wider text-[hsl(var(--m-text-muted))]">
                {isPaid ? "Paid" : "Balance due"}
              </div>
              <div className="mt-1 text-[32px] leading-[1.1] font-semibold tracking-tight">
                {fmtMoney(isPaid ? total : balance)}
              </div>
            </div>
            <MobileStatusChip status={status} />
          </div>

          <div className="mt-3 text-[15px] font-medium truncate">
            {fac?.name ?? "Clinic"}
          </div>

          {/* Meta row */}
          <div className="mt-3 grid grid-cols-3 gap-2 pt-3 border-t border-[hsl(var(--m-border))]">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-[hsl(var(--m-text-muted))]">
                Issued
              </div>
              <div className="text-[13px] mt-0.5">{fmtDate(inv.invoice_date)}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-[hsl(var(--m-text-muted))]">
                Due
              </div>
              <div className="text-[13px] mt-0.5">{fmtDate(inv.due_date)}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-[hsl(var(--m-text-muted))]">
                {isPaid ? "Paid" : "Sent"}
              </div>
              <div className="text-[13px] mt-0.5">
                {isPaid ? fmtDate(inv.paid_at) : fmtDate(inv.sent_at)}
              </div>
            </div>
          </div>
        </section>

        {/* Line items */}
        <section className="mobile-card overflow-hidden">
          <div className="px-4 pt-3 pb-2 flex items-center justify-between">
            <div className="text-[12px] uppercase tracking-wider text-[hsl(var(--m-text-muted))]">
              Line items
            </div>
            <div className="text-[12px] text-[hsl(var(--m-text-muted))]">
              {items.length}
            </div>
          </div>
          <div className="divide-y divide-[hsl(var(--m-border))]">
            {items.length === 0 && (
              <div className="px-4 py-4 text-[13px] text-[hsl(var(--m-text-muted))]">
                No line items.
              </div>
            )}
            {items.map((li) => (
              <div key={li.id} className="px-4 py-3 flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium truncate">
                    {li.description}
                  </div>
                  <div className="text-[12px] text-[hsl(var(--m-text-muted))] mt-0.5">
                    {li.service_date ? fmtDate(li.service_date) : ""}
                    {li.qty > 1 ? ` · ${li.qty} × ${fmtMoney(li.unit_rate)}` : ""}
                  </div>
                </div>
                <div className="text-[14px] font-semibold tabular-nums">
                  {fmtMoney(li.line_total)}
                </div>
              </div>
            ))}
            <div className="px-4 py-3 flex items-center justify-between bg-[hsl(var(--m-accent))]/40">
              <span className="text-[13px] font-medium text-[hsl(var(--m-text-muted))]">
                Total
              </span>
              <span className="text-[18px] font-semibold tabular-nums">
                {fmtMoney(total)}
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* Sticky CTAs */}
      <div
        className="mobile-sticky-cta fixed inset-x-0 bg-[hsl(var(--m-card))] border-t border-[hsl(var(--m-border))] px-4 pt-3"
        style={{ bottom: "calc(var(--m-bottom-nav-h) + var(--m-safe-bottom))" }}
      >
        <div className="flex gap-2 pb-3">
          <button
            onClick={() => navigate(`/invoices/${inv.id}?edit=1`)}
            className="flex-1 h-12 rounded-full bg-[hsl(var(--m-accent))] text-[hsl(var(--m-primary))] font-semibold inline-flex items-center justify-center gap-2"
          >
            <Pencil className="h-4 w-4" /> Edit
          </button>
          <button
            onClick={onShare}
            className="flex-1 h-12 rounded-full bg-[hsl(var(--m-primary))] text-[hsl(var(--m-primary-fg))] font-semibold inline-flex items-center justify-center gap-2"
          >
            <Share2 className="h-4 w-4" /> Share PDF
          </button>
        </div>
      </div>
    </div>
  );
}
