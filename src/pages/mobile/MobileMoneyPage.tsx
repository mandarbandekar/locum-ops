import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Check,
  Share2,
  AlertTriangle,
  FileEdit,
  Send,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
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
import { startOfMonth, isAfter, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";

type Tab = "invoices" | "expenses" | "mileage";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

function parseLocalDate(d: string) {
  const m = d?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  return new Date(d);
}

type GroupKey = "overdue" | "ready" | "awaiting" | "upcoming" | "paid";

export function MobileMoneyPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tabParam = (params.get("tab") as Tab) || "invoices";
  const [tab, setTab] = useState<Tab>(tabParam);
  const { invoices, facilities, getComputedInvoiceStatus } = useData();
  const {
    expenses,
    addExpense,
    editExpense,
    uploadReceipt,
    config,
    draftMileageExpenses,
    confirmMileage,
  } = useExpenses();
  const [addExpOpen, setAddExpOpen] = useState(false);

  const monthKey = new Date().toISOString().slice(0, 7);
  const monthExp =
    expenses
      .filter((e) => e.expense_date.startsWith(monthKey))
      .reduce((s, e) => s + e.amount_cents, 0) / 100;
  const mileageToConfirm = draftMileageExpenses.reduce(
    (s, e) => s + Number(e.mileage_miles || 0),
    0
  );

  function switchTab(t: Tab) {
    setTab(t);
    const next = new URLSearchParams(params);
    next.set("tab", t);
    setParams(next, { replace: true });
  }

  // ===== Invoice grouping (mirrors desktop) =====
  const groups = useMemo(() => {
    const today = startOfDay(new Date());
    const endOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59,
      999
    );
    const monthStart = startOfMonth(new Date());

    const withStatus = invoices.map((i) => ({
      ...i,
      computedStatus: getComputedInvoiceStatus(i) as string,
    }));

    const overdue = withStatus.filter((i) => isInvoiceOverdue(i as any));
    const awaiting = withStatus.filter(
      (i) =>
        (i.computedStatus === "sent" || i.computedStatus === "partial") &&
        !isInvoiceOverdue(i as any)
    );
    const drafts = withStatus.filter((i) => i.computedStatus === "draft");
    const ready = drafts.filter(
      (i) => !isAfter(parseLocalDate(i.invoice_date || i.period_end), endOfToday)
    );
    const upcoming = drafts.filter((i) =>
      isAfter(parseLocalDate(i.invoice_date || i.period_end), endOfToday)
    );
    const paid = withStatus.filter((i) => i.computedStatus === "paid");
    const paidThisMonth = paid.filter(
      (i) => i.paid_at && isAfter(new Date(i.paid_at), monthStart)
    );

    const sumBalance = (arr: typeof withStatus) =>
      arr.reduce((s, i) => s + (Number(i.balance_due) || 0), 0);
    const sumTotal = (arr: typeof withStatus) =>
      arr.reduce((s, i) => s + (Number(i.total_amount) || 0), 0);

    return {
      overdue,
      awaiting,
      ready,
      upcoming,
      paid,
      paidThisMonth,
      totals: {
        overdue: sumBalance(overdue),
        awaiting: sumBalance(awaiting),
        ready: sumTotal(ready),
        upcoming: sumTotal(upcoming),
        paidThisMonth: sumTotal(paidThisMonth),
      },
    };
  }, [invoices, getComputedInvoiceStatus]);

  const sortedInvoicesAsc = (arr: any[]) =>
    [...arr].sort(
      (a, b) =>
        +parseLocalDate(a.invoice_date || a.period_end) -
        +parseLocalDate(b.invoice_date || b.period_end)
    );
  const sortedInvoicesDesc = (arr: any[]) =>
    [...arr].sort(
      (a, b) =>
        +parseLocalDate(b.invoice_date || b.period_end) -
        +parseLocalDate(a.invoice_date || a.period_end)
    );

  const [open, setOpen] = useState<Record<GroupKey, boolean>>({
    overdue: true,
    ready: true,
    awaiting: true,
    upcoming: false,
    paid: false,
  });
  const toggle = (k: GroupKey) => setOpen((s) => ({ ...s, [k]: !s[k] }));

  async function handleShare(inv: any) {
    const fac = facilities.find((f) => f.id === inv.facility_id);
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
  }

  function InvoiceRow({
    inv,
    actions,
  }: {
    inv: any;
    actions: "overdue" | "awaiting" | "ready" | "paid" | "upcoming";
  }) {
    const fac = facilities.find((f) => f.id === inv.facility_id);
    const status = inv.computedStatus as string;
    const displayStatus = isInvoiceOverdue(inv) ? "overdue" : status;
    return (
      <div className="mobile-card p-4">
        <button
          onClick={() => navigate(`/invoices/${inv.id}`)}
          className="w-full text-left"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[15px] font-semibold truncate">
                {fac?.name ?? "Clinic"}
              </div>
              <div className="text-[12px] text-[hsl(var(--m-text-muted))] truncate">
                {parseLocalDate(
                  inv.invoice_date || inv.period_end
                ).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}{" "}
                · {inv.invoice_number}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[15px] font-semibold">
                {fmt(inv.total_amount)}
              </div>
              <div className="mt-1">
                <MobileStatusChip status={displayStatus} />
              </div>
            </div>
          </div>
        </button>
        {actions !== "upcoming" && (
          <div className="mt-3 flex gap-2">
            {actions === "ready" && (
              <button
                onClick={() => navigate(`/invoices/${inv.id}`)}
                className="flex-1 h-9 rounded-full text-[13px] font-semibold bg-[hsl(var(--m-primary))] text-[hsl(var(--m-primary-fg))]"
              >
                Review & send
              </button>
            )}
            {(actions === "overdue" || actions === "awaiting") && (
              <button
                onClick={() => navigate(`/invoices/${inv.id}`)}
                className="flex-1 h-9 rounded-full text-[13px] font-semibold bg-[hsl(var(--m-accent))] text-[hsl(var(--m-primary))]"
              >
                Mark paid
              </button>
            )}
            <button
              onClick={() => handleShare(inv)}
              className={cn(
                "h-9 inline-flex items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold px-4",
                actions === "paid"
                  ? "flex-1 bg-[hsl(var(--m-accent))] text-[hsl(var(--m-primary))]"
                  : "bg-[hsl(var(--m-accent))] text-[hsl(var(--m-primary))]"
              )}
            >
              <Share2 className="h-3.5 w-3.5" /> Share
            </button>
          </div>
        )}
      </div>
    );
  }

  function Section({
    k,
    title,
    icon,
    accent,
    items,
    amountLabel,
    amount,
    rightHint,
    actions,
    sort = "desc",
  }: {
    k: GroupKey;
    title: string;
    icon: React.ReactNode;
    accent: string;
    items: any[];
    amountLabel?: string;
    amount?: number;
    rightHint?: string;
    actions: "overdue" | "awaiting" | "ready" | "paid" | "upcoming";
    sort?: "asc" | "desc";
  }) {
    if (items.length === 0) return null;
    const isOpen = open[k];
    const sorted = sort === "asc" ? sortedInvoicesAsc(items) : sortedInvoicesDesc(items);
    return (
      <div className="space-y-2">
        <button
          onClick={() => toggle(k)}
          className="w-full flex items-center gap-2 px-1 py-1.5"
        >
          <span className={cn("inline-flex items-center justify-center h-5 w-5", accent)}>
            {icon}
          </span>
          <span className="text-[13px] font-semibold text-[hsl(var(--m-text))]">
            {title}
          </span>
          <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-[hsl(var(--m-surface-2))] text-[hsl(var(--m-text-muted))]">
            {items.length}
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            {typeof amount === "number" && (
              <span className={cn("text-[12px] font-semibold", accent)}>
                {fmt(amount)}
                {amountLabel ? ` ${amountLabel}` : ""}
              </span>
            )}
            {rightHint && (
              <span className="text-[11px] text-[hsl(var(--m-text-muted))]">
                {rightHint}
              </span>
            )}
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-[hsl(var(--m-text-muted))]" />
            ) : (
              <ChevronRight className="h-4 w-4 text-[hsl(var(--m-text-muted))]" />
            )}
          </span>
        </button>
        {isOpen && (
          <div className="space-y-2">
            {sorted.map((inv) => (
              <InvoiceRow key={inv.id} inv={inv} actions={actions} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Tab-specific top metrics
  const topMetrics =
    tab === "invoices" ? (
      <>
        <MobileMetricCard
          label="Overdue"
          value={fmt(groups.totals.overdue)}
          hint={`${groups.overdue.length} invoice${groups.overdue.length === 1 ? "" : "s"}`}
          tone="danger"
        />
        <MobileMetricCard
          label="Awaiting"
          value={fmt(groups.totals.awaiting)}
          hint={`${groups.awaiting.length} sent`}
          tone="primary"
        />
        <MobileMetricCard
          label="To review"
          value={fmt(groups.totals.ready)}
          hint={`${groups.ready.length} draft${groups.ready.length === 1 ? "" : "s"}`}
          tone="warning"
        />
      </>
    ) : tab === "expenses" ? (
      <>
        <MobileMetricCard label="This month" value={fmt(monthExp)} hint="MTD" />
        <MobileMetricCard
          label="Mileage"
          value={`${Math.round(mileageToConfirm)} mi`}
          hint="To confirm"
        />
        <MobileMetricCard
          label="Outstanding"
          value={fmt(groups.totals.overdue + groups.totals.awaiting)}
          tone="warning"
          hint="Invoices"
        />
      </>
    ) : (
      <>
        <MobileMetricCard
          label="To confirm"
          value={`${Math.round(mileageToConfirm)} mi`}
          tone="warning"
          hint={`${draftMileageExpenses.length} trip${draftMileageExpenses.length === 1 ? "" : "s"}`}
        />
        <MobileMetricCard label="Expenses" value={fmt(monthExp)} hint="MTD" />
        <MobileMetricCard
          label="Outstanding"
          value={fmt(groups.totals.overdue + groups.totals.awaiting)}
          tone="primary"
          hint="Invoices"
        />
      </>
    );

  return (
    <div>
      <MobilePageHeader title="Money" subtitle="Invoices, expenses, and mileage." />

      <div className="px-5 grid grid-cols-3 gap-2">{topMetrics}</div>

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
        <div className="px-5 mt-4 space-y-4">
          {invoices.length === 0 && (
            <div className="mobile-card p-6 text-center">
              <div className="text-[14px] font-semibold">No invoices yet</div>
              <div className="text-[12px] text-[hsl(var(--m-text-muted))] mt-1">
                Invoices appear here automatically once shifts are completed.
              </div>
            </div>
          )}

          {groups.overdue.length > 0 && (
            <button
              onClick={() => navigate(`/invoices/${sortedInvoicesAsc(groups.overdue)[0].id}`)}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-red-200 bg-red-50 text-left dark:border-red-900/40 dark:bg-red-950/30"
            >
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
              <div className="text-[12.5px] text-red-800 dark:text-red-300 flex-1">
                <span className="font-semibold">{fmt(groups.totals.overdue)} overdue</span>
                {" "}across {groups.overdue.length} invoice
                {groups.overdue.length === 1 ? "" : "s"}.
              </div>
              <span className="text-[12px] font-semibold text-red-700 dark:text-red-300">
                Review →
              </span>
            </button>
          )}

          {groups.ready.length > 0 && (
            <button
              onClick={() => navigate(`/invoices/${sortedInvoicesAsc(groups.ready)[0].id}`)}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-amber-200 bg-amber-50 text-left dark:border-amber-900/40 dark:bg-amber-950/30"
            >
              <FileEdit className="h-4 w-4 text-amber-600 shrink-0" />
              <div className="text-[12.5px] text-amber-900 dark:text-amber-300 flex-1">
                <span className="font-semibold">
                  {groups.ready.length} invoice{groups.ready.length === 1 ? "" : "s"} ready
                </span>{" "}
                to review and send.
              </div>
              <span className="text-[12px] font-semibold text-amber-800 dark:text-amber-300">
                Review next →
              </span>
            </button>
          )}

          <Section
            k="overdue"
            title="Overdue"
            icon={<AlertTriangle className="h-4 w-4" />}
            accent="text-red-600 dark:text-red-400"
            items={groups.overdue}
            amount={groups.totals.overdue}
            amountLabel="due"
            actions="overdue"
            sort="asc"
          />
          <Section
            k="ready"
            title="Ready to review"
            icon={<FileEdit className="h-4 w-4" />}
            accent="text-amber-600 dark:text-amber-400"
            items={groups.ready}
            amount={groups.totals.ready}
            actions="ready"
            sort="asc"
          />
          <Section
            k="awaiting"
            title="Sent & awaiting payment"
            icon={<Send className="h-4 w-4" />}
            accent="text-blue-600 dark:text-blue-400"
            items={groups.awaiting}
            amount={groups.totals.awaiting}
            amountLabel="open"
            actions="awaiting"
          />
          <Section
            k="upcoming"
            title="Upcoming"
            icon={<Clock className="h-4 w-4" />}
            accent="text-[hsl(var(--m-text-muted))]"
            items={groups.upcoming}
            amount={groups.totals.upcoming}
            actions="upcoming"
            sort="asc"
          />
          <Section
            k="paid"
            title="Paid"
            icon={<CheckCircle2 className="h-4 w-4" />}
            accent="text-emerald-600 dark:text-emerald-400"
            items={groups.paid}
            rightHint={
              groups.paidThisMonth.length > 0
                ? `${fmt(groups.totals.paidThisMonth)} MTD`
                : undefined
            }
            actions="paid"
          />
        </div>
      )}

      {tab === "expenses" && (
        <div className="px-5 mt-4 space-y-2">
          {expenses.slice(0, 50).map((e) => (
            <div key={e.id} className="mobile-card p-4 flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold truncate">
                  {e.description || e.subcategory || "Expense"}
                </div>
                <div className="text-[12px] text-[hsl(var(--m-text-muted))]">
                  {new Date(e.expense_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  · {e.category || "Uncategorized"}
                </div>
              </div>
              <div className="text-[14px] font-semibold">
                {fmt(e.amount_cents / 100)}
              </div>
            </div>
          ))}
          {expenses.length === 0 && (
            <div className="mobile-card p-5 text-center text-[14px] text-[hsl(var(--m-text-muted))]">
              No expenses yet.
            </div>
          )}
          <MobileFab label="Add expense" onClick={() => setAddExpOpen(true)} />
        </div>
      )}

      {tab === "mileage" && (
        <div className="px-5 mt-4 space-y-2">
          {draftMileageExpenses.length === 0 && (
            <div className="mobile-card p-5 text-center text-[14px] text-[hsl(var(--m-text-muted))]">
              All caught up — no mileage to confirm.
            </div>
          )}
          {draftMileageExpenses.map((e) => {
            const fac = facilities.find((f) => f.id === e.facility_id);
            return (
              <div key={e.id} className="mobile-card p-4">
                <div className="text-[14px] font-semibold">
                  {fac?.name ?? "Trip"} → Home
                </div>
                <div className="text-[12px] text-[hsl(var(--m-text-muted))] mt-0.5">
                  {Number(e.mileage_miles || 0).toFixed(1)} miles ·{" "}
                  {new Date(e.expense_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
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
        <MobileFab
          label="Create invoice"
          onClick={() => navigate("/invoices")}
          iconOnly
        />
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
