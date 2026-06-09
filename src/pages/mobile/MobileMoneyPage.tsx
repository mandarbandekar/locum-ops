import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, Share2, AlertTriangle, FileEdit, Send, Clock, CheckCircle, ChevronDown } from "lucide-react";
import { MobilePageHeader } from "@/components/mobile/MobilePageHeader";
import { MobileMetricCard } from "@/components/mobile/MobileMetricCard";
import { MobileSegmentedControl } from "@/components/mobile/MobileSegmentedControl";
import { MobileStatusChip } from "@/components/mobile/MobileStatusChip";
import { MobileFab } from "@/components/mobile/MobileFab";
import { useData } from "@/contexts/DataContext";
import { useExpenses } from "@/hooks/useExpenses";
import AddExpenseDialog from "@/components/expenses/AddExpenseDialog";
import { shareInvoicePdf } from "@/lib/mobileInvoiceShare";
import { isInvoiceOverdue } from "@/lib/invoiceHelpers";
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

  const groups = useMemo(() => {
    const withStatus = invoices.map((i) => ({ ...i, _status: getComputedInvoiceStatus(i) as string }));
    const today = new Date();
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    const parseLocal = (d: string) => {
      const m = d?.match?.(/^(\d{4})-(\d{2})-(\d{2})/);
      return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(d);
    };
    const overdue = withStatus.filter((i) => isInvoiceOverdue(i as any));
    const awaiting = withStatus.filter(
      (i) => (i._status === "sent" || i._status === "partial") && !isInvoiceOverdue(i as any),
    );
    const drafts = withStatus.filter((i) => i._status === "draft");
    const ready = drafts.filter((i) => parseLocal(i.invoice_date || i.period_end) <= endOfToday);
    const upcoming = drafts.filter((i) => parseLocal(i.invoice_date || i.period_end) > endOfToday);
    const paid = withStatus.filter((i) => i._status === "paid");
    const byDateDesc = (a: any, b: any) => +new Date(b.invoice_date) - +new Date(a.invoice_date);
    const byDateAsc = (a: any, b: any) => +new Date(a.invoice_date) - +new Date(b.invoice_date);
    return {
      overdue: overdue.sort(byDateAsc),
      ready: ready.sort(byDateAsc),
      awaiting: awaiting.sort(byDateAsc),
      upcoming: upcoming.sort(byDateAsc),
      paid: paid.sort(byDateDesc),
    };
  }, [invoices, getComputedInvoiceStatus]);

  const sumBalance = (arr: any[]) => arr.reduce((s, i) => s + (Number(i.balance_due) || 0), 0);
  const sumTotal = (arr: any[]) => arr.reduce((s, i) => s + (Number(i.total_amount) || 0), 0);

  function InvoiceRow({ inv }: { inv: any }) {
    const fac = facilities.find((f) => f.id === inv.facility_id);
    const status = getComputedInvoiceStatus(inv) as string;
    const isPaid = status === "paid";
    return (
      <div className="mobile-card p-4">
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
  }

  function Section({
    id,
    title,
    icon,
    items,
    rightLabel,
    defaultOpen = true,
    tone = "default",
  }: {
    id: string;
    title: string;
    icon: React.ReactNode;
    items: any[];
    rightLabel?: string;
    defaultOpen?: boolean;
    tone?: "default" | "danger" | "warning" | "info" | "muted" | "success";
  }) {
    const [open, setOpen] = useState(defaultOpen);
    if (items.length === 0) return null;
    const toneClass =
      tone === "danger"
        ? "text-[hsl(var(--destructive))]"
        : tone === "warning"
        ? "text-amber-600 dark:text-amber-400"
        : tone === "info"
        ? "text-blue-600 dark:text-blue-400"
        : tone === "success"
        ? "text-emerald-600 dark:text-emerald-400"
        : tone === "muted"
        ? "text-[hsl(var(--m-text-muted))]"
        : "text-[hsl(var(--m-text))]";
    return (
      <section key={id} className="space-y-2">
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between px-1 py-1"
        >
          <div className={`flex items-center gap-2 text-[13px] font-semibold ${toneClass}`}>
            {icon}
            <span>{title}</span>
            <span className="text-[hsl(var(--m-text-muted))] font-medium">({items.length})</span>
          </div>
          <div className="flex items-center gap-2">
            {rightLabel && (
              <span className={`text-[12px] font-semibold ${toneClass}`}>{rightLabel}</span>
            )}
            <ChevronDown className={`h-4 w-4 text-[hsl(var(--m-text-muted))] transition-transform ${open ? "" : "-rotate-90"}`} />
          </div>
        </button>
        {open && <div className="space-y-2">{items.map((inv) => <InvoiceRow key={inv.id} inv={inv} />)}</div>}
      </section>
    );
  }

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
        <div className="px-5 mt-4 space-y-5">
          {invoices.length === 0 && (
            <div className="mobile-card p-5 text-center text-[14px] text-[hsl(var(--m-text-muted))]">No invoices yet.</div>
          )}
          <Section
            id="overdue"
            title="Overdue"
            icon={<AlertTriangle className="h-4 w-4" />}
            items={groups.overdue}
            rightLabel={groups.overdue.length ? `${fmt(sumBalance(groups.overdue))} overdue` : undefined}
            tone="danger"
          />
          <Section
            id="ready"
            title="Ready to Review"
            icon={<FileEdit className="h-4 w-4" />}
            items={groups.ready}
            rightLabel={groups.ready.length ? fmt(sumTotal(groups.ready)) : undefined}
            tone="warning"
          />
          <Section
            id="awaiting"
            title="Sent & Awaiting Payment"
            icon={<Send className="h-4 w-4" />}
            items={groups.awaiting}
            rightLabel={groups.awaiting.length ? `${fmt(sumBalance(groups.awaiting))} outstanding` : undefined}
            tone="info"
          />
          <Section
            id="upcoming"
            title="Upcoming (auto-generated)"
            icon={<Clock className="h-4 w-4" />}
            items={groups.upcoming}
            rightLabel={groups.upcoming.length ? `${fmt(sumTotal(groups.upcoming))} upcoming` : undefined}
            defaultOpen={false}
            tone="muted"
          />
          <Section
            id="paid"
            title="Paid"
            icon={<CheckCircle className="h-4 w-4" />}
            items={groups.paid}
            rightLabel={groups.paid.length ? fmt(sumTotal(groups.paid)) : undefined}
            defaultOpen={false}
            tone="success"
          />
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
