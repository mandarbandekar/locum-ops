import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, CalendarPlus, Navigation, Phone, FileText, AlertCircle } from "lucide-react";
import { MobilePageHeader } from "@/components/mobile/MobilePageHeader";
import { MobileMetricCard } from "@/components/mobile/MobileMetricCard";
import { useData } from "@/contexts/DataContext";
import { useExpenses } from "@/hooks/useExpenses";
import { AddFacilityDialog } from "@/components/AddFacilityDialog";
import { ShiftFormDialog } from "@/components/schedule/ShiftFormDialog";
import { resolveShiftTz } from "@/lib/resolveTimezone";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { formatDateInTz, formatTimeInTz } from "@/lib/tzTime";

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);
}

export function MobileTodayPage() {
  const navigate = useNavigate();
  const { facilities, shifts, invoices, getComputedInvoiceStatus, terms } = useData();
  const { expenses } = useExpenses();
  const { profile } = useUserProfile();
  const [addClinic, setAddClinic] = useState(false);
  const [addShift, setAddShift] = useState(false);

  const now = Date.now();
  const nextShift = useMemo(() => {
    return [...shifts]
      .filter((s) => new Date(s.start_datetime).getTime() >= now - 1000 * 60 * 60 * 2)
      .sort((a, b) => +new Date(a.start_datetime) - +new Date(b.start_datetime))[0];
  }, [shifts]);

  const nextFacility = nextShift ? facilities.find((f) => f.id === nextShift.facility_id) : null;
  const nextTz = nextShift && nextFacility ? resolveShiftTz(nextShift as any, nextFacility as any, profile as any) : "America/New_York";

  // Monthly metrics
  const monthKey = new Date().toISOString().slice(0, 7);
  const monthRevenue = shifts
    .filter((s) => s.start_datetime.startsWith(monthKey) && new Date(s.start_datetime) <= new Date())
    .reduce((sum, s) => sum + (Number(s.rate_applied) || 0) + (Number(s.overtime_hours || 0) * Number(s.overtime_rate || 0)), 0);

  const outstanding = invoices
    .filter((i) => ["sent", "partial"].includes(getComputedInvoiceStatus(i) as string) || getComputedInvoiceStatus(i) === "overdue")
    .reduce((sum, i) => sum + (Number(i.balance_due) || 0), 0);

  const monthExpenses = expenses
    .filter((e) => e.expense_date.startsWith(monthKey))
    .reduce((sum, e) => sum + (Number(e.amount_cents) || 0), 0) / 100;

  const monthMiles = expenses
    .filter((e) => e.expense_date.startsWith(monthKey) && e.mileage_miles)
    .reduce((sum, e) => sum + Number(e.mileage_miles || 0), 0);

  // Needs attention
  const overdueInvoices = invoices.filter((i) => getComputedInvoiceStatus(i) === "overdue");
  const pendingMileage = expenses.filter((e) => e.is_auto_mileage && e.mileage_status === "draft");
  const uncategorized = expenses.filter((e) => !e.category || e.category === "uncategorized");

  const attention = [
    ...overdueInvoices.slice(0, 2).map((i) => {
      const fac = facilities.find((f) => f.id === i.facility_id);
      return {
        key: `inv-${i.id}`,
        title: `Invoice ${i.invoice_number} overdue`,
        meta: `${fac?.name ?? ""} · ${fmtCurrency(i.balance_due)}`,
        action: () => navigate(`/invoices/${i.id}`),
      };
    }),
    pendingMileage.length > 0 && {
      key: "mileage",
      title: `${pendingMileage.length} mileage trip${pendingMileage.length === 1 ? "" : "s"} need confirmation`,
      meta: "Tap to review",
      action: () => navigate("/invoices?tab=mileage"),
    },
    uncategorized.length > 0 && {
      key: "uncat",
      title: `${uncategorized.length} expense${uncategorized.length === 1 ? "" : "s"} uncategorized`,
      meta: "Add a category to keep books clean",
      action: () => navigate("/invoices?tab=expenses"),
    },
  ].filter(Boolean) as { key: string; title: string; meta: string; action: () => void }[];

  return (
    <div>
      <MobilePageHeader title="Today" subtitle="Your business at a glance." />

      {/* Quick actions */}
      <div className="px-5 grid grid-cols-2 gap-3">
        <button
          onClick={() => setAddClinic(true)}
          className="mobile-card flex items-center gap-2 px-4 py-3.5 text-[14px] font-semibold text-[hsl(var(--m-text))]"
        >
          <Building2 className="h-4 w-4 text-[hsl(var(--m-primary))]" />
          Add clinic
        </button>
        <button
          onClick={() => setAddShift(true)}
          className="mobile-card flex items-center gap-2 px-4 py-3.5 text-[14px] font-semibold text-[hsl(var(--m-text))]"
        >
          <CalendarPlus className="h-4 w-4 text-[hsl(var(--m-primary))]" />
          Add shift
        </button>
      </div>

      {/* Next shift */}
      <section className="px-5 mt-5">
        <div className="text-[11px] uppercase tracking-wide font-semibold text-[hsl(var(--m-text-muted))] mb-2">
          Next shift
        </div>
        {nextShift && nextFacility ? (
          <div className="mobile-card p-4">
            <div className="text-[16px] font-semibold text-[hsl(var(--m-text))]">{nextFacility.name}</div>
            <div className="text-[13px] text-[hsl(var(--m-text-muted))] mt-0.5">
              {formatDateInTz(nextShift.start_datetime, nextTz, "EEE, MMM d")} ·{" "}
              {formatTimeInTz(nextShift.start_datetime, nextTz)} – {formatTimeInTz(nextShift.end_datetime, nextTz)}
            </div>
            {nextFacility.address && (
              <div className="text-[13px] text-[hsl(var(--m-text-muted))] mt-0.5">{nextFacility.address}</div>
            )}
            <div className="mt-3 grid grid-cols-3 gap-2">
              <a
                href={nextFacility.address ? `https://maps.google.com/?q=${encodeURIComponent(nextFacility.address)}` : "#"}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center gap-1 py-2 rounded-lg bg-[hsl(var(--m-accent))] text-[hsl(var(--m-primary))] text-[11px] font-medium"
              >
                <Navigation className="h-4 w-4" /> Directions
              </a>
              {(() => {
                const phone = "";
                return (
                  <button
                    type="button"
                    onClick={() => navigate(`/facilities/${nextFacility.id}`)}
                    className="flex flex-col items-center gap-1 py-2 rounded-lg bg-[hsl(var(--m-accent))] text-[hsl(var(--m-primary))] text-[11px] font-medium"
                  >
                    <Phone className="h-4 w-4" /> Call
                  </button>
                );
              })()}
              <button
                type="button"
                onClick={() => navigate(`/facilities/${nextFacility.id}`)}
                className="flex flex-col items-center gap-1 py-2 rounded-lg bg-[hsl(var(--m-accent))] text-[hsl(var(--m-primary))] text-[11px] font-medium"
              >
                <FileText className="h-4 w-4" /> Notes
              </button>
            </div>
          </div>
        ) : (
          <div className="mobile-card p-4 text-[14px] text-[hsl(var(--m-text-muted))]">
            No upcoming shifts. Add one to get started.
          </div>
        )}
      </section>

      {/* Needs attention */}
      {attention.length > 0 && (
        <section className="px-5 mt-5">
          <div className="text-[11px] uppercase tracking-wide font-semibold text-[hsl(var(--m-text-muted))] mb-2">
            Needs attention
          </div>
          <div className="mobile-card divide-y divide-[hsl(var(--m-border))]">
            {attention.map((a) => (
              <button
                key={a.key}
                onClick={a.action}
                className="w-full text-left flex items-start gap-3 p-4"
              >
                <AlertCircle className="h-4 w-4 mt-0.5 text-[hsl(var(--m-warning))] shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium text-[hsl(var(--m-text))]">{a.title}</div>
                  <div className="text-[12px] text-[hsl(var(--m-text-muted))] mt-0.5 truncate">{a.meta}</div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Business snapshot */}
      <section className="px-5 mt-5">
        <div className="text-[11px] uppercase tracking-wide font-semibold text-[hsl(var(--m-text-muted))] mb-2">
          Business snapshot
        </div>
        <div className="grid grid-cols-2 gap-3">
          <MobileMetricCard label="This month" value={fmtCurrency(monthRevenue)} hint="Revenue" tone="primary" />
          <MobileMetricCard label="Outstanding" value={fmtCurrency(outstanding)} hint="To collect" tone="warning" />
          <MobileMetricCard label="Expenses" value={fmtCurrency(monthExpenses)} hint="This month" />
          <MobileMetricCard label="Mileage" value={`${Math.round(monthMiles)} mi`} hint="This month" />
        </div>
      </section>

      <AddFacilityDialog open={addClinic} onOpenChange={setAddClinic} />
      <ShiftFormDialog
        open={addShift}
        onOpenChange={setAddShift}
        facilities={facilities}
        shifts={shifts}
        terms={terms}
      />
    </div>
  );
}
