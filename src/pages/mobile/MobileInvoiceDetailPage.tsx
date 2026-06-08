import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Pencil, Share2 } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { MobileStatusChip } from "@/components/mobile/MobileStatusChip";
import { shareInvoicePdf } from "@/lib/mobileInvoiceShare";
import { toast } from "sonner";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);
}

export function MobileInvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { invoices, facilities, lineItems, getComputedInvoiceStatus } = useData();
  const inv = invoices.find((i) => i.id === id);

  const items = useMemo(() => inv ? lineItems.filter((l) => l.invoice_id === inv.id) : [], [lineItems, inv]);

  if (!inv) {
    return (
      <div className="p-5">
        <button onClick={() => navigate(-1)} className="text-[14px] text-[hsl(var(--m-primary))]">‹ Back</button>
        <div className="mt-6 text-[14px] text-[hsl(var(--m-text-muted))]">Invoice not found.</div>
      </div>
    );
  }

  const fac = facilities.find((f) => f.id === inv.facility_id);
  const status = getComputedInvoiceStatus(inv) as string;

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

  return (
    <div className="pb-32">
      <header className="px-5 pt-safe pb-2 flex items-center gap-2">
        <button onClick={() => navigate(-1)} aria-label="Back" className="h-9 w-9 rounded-full flex items-center justify-center text-[hsl(var(--m-text))]">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-[18px] font-semibold truncate">Invoice {inv.invoice_number}</div>
      </header>

      <div className="px-5 mt-2 space-y-4">
        <div className="mobile-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[15px] font-semibold">{fac?.name ?? "Clinic"}</div>
              <div className="text-[12px] text-[hsl(var(--m-text-muted))] mt-0.5">
                Sent {inv.sent_at ? new Date(inv.sent_at).toLocaleDateString() : "—"}
              </div>
              <div className="text-[12px] text-[hsl(var(--m-text-muted))]">
                Due {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "—"}
              </div>
            </div>
            <MobileStatusChip status={status} />
          </div>
        </div>

        <div className="mobile-card divide-y divide-[hsl(var(--m-border))]">
          {items.length === 0 && <div className="p-4 text-[13px] text-[hsl(var(--m-text-muted))]">No line items.</div>}
          {items.map((li) => (
            <div key={li.id} className="p-4 flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-medium">{li.description}</div>
                <div className="text-[12px] text-[hsl(var(--m-text-muted))]">
                  {li.service_date ? new Date(li.service_date).toLocaleDateString() : ""} · {li.qty} × {fmt(li.unit_rate)}
                </div>
              </div>
              <div className="text-[14px] font-semibold">{fmt(li.line_total)}</div>
            </div>
          ))}
          <div className="p-4 flex items-center justify-between">
            <span className="text-[13px] text-[hsl(var(--m-text-muted))]">Total</span>
            <span className="text-[18px] font-semibold">{fmt(inv.total_amount)}</span>
          </div>
        </div>
      </div>

      <div
        className="mobile-sticky-cta fixed inset-x-0 bg-[hsl(var(--m-card))] border-t border-[hsl(var(--m-border))] px-5 pt-3"
        style={{ bottom: "calc(var(--m-bottom-nav-h) + var(--m-safe-bottom))" }}
      >
        <div className="flex gap-2 pb-3">
          <button
            onClick={() => navigate(`/invoices/${inv.id}?edit=1`)}
            className="flex-1 h-12 rounded-full bg-[hsl(var(--m-accent))] text-[hsl(var(--m-primary))] font-semibold inline-flex items-center justify-center gap-2"
          >
            <Pencil className="h-4 w-4" /> Edit invoice
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
