import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Check, Share2 } from "lucide-react";
import { MobilePageHeader } from "@/components/mobile/MobilePageHeader";
import { MobileMetricCard } from "@/components/mobile/MobileMetricCard";
import { MobileSegmentedControl } from "@/components/mobile/MobileSegmentedControl";
import { MobileStatusChip } from "@/components/mobile/MobileStatusChip";
import { MobileFab } from "@/components/mobile/MobileFab";
import { useData } from "@/contexts/DataContext";
import { useExpenses } from "@/hooks/useExpenses";
import AddExpenseDialog from "@/components/expenses/AddExpenseDialog";
import { shareInvoicePdf } from "@/lib/mobileInvoiceShare";
import { toast } from "sonner";

type Tab = "invoices" | "expenses" | "mileage";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);
}

export function MobileMoneyPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tabParam = (params.get("tab") as Tab) || "invoices";
  const [tab, setTab] = useState<Tab>(tabParam);
  const { invoices, facilities, getComputedInvoiceStatus } = useData();
  const { expenses, addExpense, editExpense, uploadReceipt, config, draftMileageExpenses, confirmMileage } = useExpenses();
  const [addExpOpen, setAddExpOpen] = useState(false);

  const outstanding = invoices.reduce((s, i) => {
    const st = getComputedInvoiceStatus(i) as string;
    if (st === "sent" || st === "partial" || st === "overdue") return s + (Number(i.balance_due) || 0);
    return s;
  }, 0);

  const monthKey = new Date().toISOString().slice(0, 7);
  const monthExp = expenses.filter((e) => e.expense_date.startsWith(monthKey)).reduce((s, e) => s + e.amount_cents, 0) / 100;
  const mileageToConfirm = draftMileageExpenses.reduce((s, e) => s + Number(e.mileage_miles || 0), 0);

  function switchTab(t: Tab) {
    setTab(t);
    const next = new URLSearchParams(params);
    next.set("tab", t);
    setParams(next, { replace: true });
  }

  const sortedInvoices = useMemo(
    () => [...invoices].sort((a, b) => +new Date(b.invoice_date) - +new Date(a.invoice_date)),
    [invoices]
  );

  return (
    <div>
      <MobilePageHeader title="Money" subtitle="Invoices, expenses, and mileage." />

      <div className="px-5 grid grid-cols-3 gap-2">
        <MobileMetricCard label="Outstanding" value={fmt(outstanding)} tone="warning" />
        <MobileMetricCard label="Expenses" value={fmt(monthExp)} hint="MTD" />
        <MobileMetricCard label="Mileage" value={`${Math.round(mileageToConfirm)} mi`} hint="To confirm" />
      </div>

      <div className="px-5 mt-4">
        <MobileSegmentedControl
          value={tab}
          onChange={switchTab}
          options={[
            { value: "invoices", label: "Invoices" },
            { value: "expenses", label: "Expenses" },
            { value: "mileage", label: "Mileage" },
          ]}
        />
      </div>

      {tab === "invoices" && (
        <div className="px-5 mt-4 space-y-2">
          {sortedInvoices.length === 0 && (
            <div className="mobile-card p-5 text-center text-[14px] text-[hsl(var(--m-text-muted))]">No invoices yet.</div>
          )}
          {sortedInvoices.map((inv) => {
            const fac = facilities.find((f) => f.id === inv.facility_id);
            const status = getComputedInvoiceStatus(inv) as string;
            const isPaid = status === "paid";
            return (
              <div key={inv.id} className="mobile-card p-4">
                <button onClick={() => navigate(`/invoices/${inv.id}`)} className="w-full text-left">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[15px] font-semibold truncate">{fac?.name ?? "Clinic"}</div>
                      <div className="text-[12px] text-[hsl(var(--m-text-muted))]">
                        {new Date(inv.invoice_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · {inv.invoice_number}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[15px] font-semibold">{fmt(inv.total_amount)}</div>
                      <div className="mt-1"><MobileStatusChip status={status} /></div>
                    </div>
                  </div>
                </button>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                    className="flex-1 h-9 rounded-full text-[13px] font-semibold bg-[hsl(var(--m-accent))] text-[hsl(var(--m-primary))]"
                  >
                    {isPaid ? "View" : "Review"}
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await shareInvoicePdf({
                          invoiceId: inv.id,
                          invoiceNumber: inv.invoice_number,
                          cacheKey: String(inv.balance_due) + (inv.paid_at || ""),
                          facilityName: fac?.name,
                        });
                      } catch {
                        toast.error("Failed to share PDF");
                      }
                    }}
                    className="flex-1 h-9 inline-flex items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold bg-[hsl(var(--m-primary))] text-[hsl(var(--m-primary-fg))]"
                  >
                    <Share2 className="h-3.5 w-3.5" /> Share
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "expenses" && (
        <div className="px-5 mt-4 space-y-2">
          {expenses.slice(0, 50).map((e) => (
            <div key={e.id} className="mobile-card p-4 flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold truncate">{e.description || e.subcategory || "Expense"}</div>
                <div className="text-[12px] text-[hsl(var(--m-text-muted))]">
                  {new Date(e.expense_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {e.category || "Uncategorized"}
                </div>
              </div>
              <div className="text-[14px] font-semibold">{fmt(e.amount_cents / 100)}</div>
            </div>
          ))}
          {expenses.length === 0 && (
            <div className="mobile-card p-5 text-center text-[14px] text-[hsl(var(--m-text-muted))]">No expenses yet.</div>
          )}
          <MobileFab label="Add expense" onClick={() => setAddExpOpen(true)} />
        </div>
      )}

      {tab === "mileage" && (
        <div className="px-5 mt-4 space-y-2">
          {draftMileageExpenses.length === 0 && (
            <div className="mobile-card p-5 text-center text-[14px] text-[hsl(var(--m-text-muted))]">All caught up — no mileage to confirm.</div>
          )}
          {draftMileageExpenses.map((e) => {
            const fac = facilities.find((f) => f.id === e.facility_id);
            return (
              <div key={e.id} className="mobile-card p-4">
                <div className="text-[14px] font-semibold">{fac?.name ?? "Trip"} → Home</div>
                <div className="text-[12px] text-[hsl(var(--m-text-muted))] mt-0.5">
                  {Number(e.mileage_miles || 0).toFixed(1)} miles · {new Date(e.expense_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </div>
                <button
                  onClick={() => confirmMileage(e.id)}
                  className="mt-3 w-full h-10 rounded-full bg-[hsl(var(--m-primary))] text-[hsl(var(--m-primary-fg))] font-semibold text-[13px] inline-flex items-center justify-center gap-1.5"
                >
                  <Check className="h-4 w-4" /> Confirm mileage
                </button>
              </div>
            );
          })}
        </div>
      )}

      {tab === "invoices" && (
        <MobileFab label="Create invoice" onClick={() => navigate("/invoices")} iconOnly />
      )}

      <AddExpenseDialog
        open={addExpOpen}
        onOpenChange={setAddExpOpen}
        onSubmit={addExpense}
        onEdit={editExpense}
        uploadReceipt={uploadReceipt}
        config={config}
        expenses={expenses}
      />
    </div>
  );
}
