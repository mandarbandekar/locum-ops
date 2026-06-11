import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, CalendarPlus, Navigation, Phone, FileText, AlertCircle, CalendarDays } from "lucide-react";
import { MobileMetricCard } from "@/components/mobile/MobileMetricCard";
import { MobileEmptyState } from "@/components/mobile/MobileEmptyState";
import { MobileMetricsSkeleton, MobileSectionSkeleton, Skeleton } from "@/components/mobile/MobileSkeleton";
import { useData } from "@/contexts/DataContext";
import type { Shift } from "@/types";
import { useExpenses } from "@/hooks/useExpenses";
import { AddFacilityDialog } from "@/components/AddFacilityDialog";
import { ShiftFormDialog } from "@/components/schedule/ShiftFormDialog";
import { resolveShiftTz } from "@/lib/resolveTimezone";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { formatDateInTz, formatTimeInTz } from "@/lib/tzTime";

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function MobileTodayPage() {
  const navigate = useNavigate();
  const { facilities, shifts, invoices, getComputedInvoiceStatus, terms, addShift: addShiftMut, updateShift, deleteShift, dataLoading } = useData();
  const { expenses, loading: expensesLoading } = useExpenses();
  const { profile } = useUserProfile();
  const isLoading = dataLoading || expensesLoading;
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
  // Only flag expenses with a truly missing category. "Uncategorized → Other"
  // is an intentional bucket users can pick (e.g. dues, donations, taxes that
  // don't fit a Schedule C line), so it shouldn't sit in Needs attention forever.
  const uncategorized = expenses.filter((e) => !e.category || (e.category as string).trim() === "");

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

  if (isLoading) {
    return (
      <div className="m-page">
        <Skeleton h={32} w={200} rounded="rounded-md" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton h={56} rounded="rounded-2xl" />
          <Skeleton h={56} rounded="rounded-2xl" />
        </div>
        <MobileSectionSkeleton />
        <MobileMetricsSkeleton count={4} />
      </div>
    );
  }

  return (
    <div className="m-page">
      {/* Greeting header */}
      <header className="m-page-header">
        <h1 className="m-title text-[hsl(var(--m-text))]">
          {getGreeting()}, {profile?.first_name ?? "there"}
        </h1>
        <p className="m-subtitle">Here's where things stand today.</p>
      </header>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setAddClinic(true)}
          className="mobile-card m-press flex items-center justify-center gap-2 px-4 min-h-[56px] font-semibold text-[hsl(var(--m-text))]"
          style={{ fontSize: "var(--m-text-md)" }}
        >
          <Building2 className="h-4 w-4 text-[hsl(var(--m-primary))]" />
          Add clinic
        </button>
        <button
          onClick={() => setAddShift(true)}
          className="mobile-card m-press flex items-center justify-center gap-2 px-4 min-h-[56px] font-semibold text-[hsl(var(--m-text))]"
          style={{ fontSize: "var(--m-text-md)" }}
        >
          <CalendarPlus className="h-4 w-4 text-[hsl(var(--m-primary))]" />
          Add shift
        </button>
      </div>

      {/* Next shift */}
      <section className="m-section">
        <div className="m-section-label">Next shift</div>
        {nextShift && nextFacility ? (
          <div className="mobile-card p-5">
            <div className="text-[16px] font-semibold leading-snug text-[hsl(var(--m-text))]">{nextFacility.name}</div>
            <div className="text-[13px] text-[hsl(var(--m-text-muted))] mt-1">
              {formatDateInTz(nextShift.start_datetime, nextTz, "EEE, MMM d")} ·{" "}
              {formatTimeInTz(nextShift.start_datetime, nextTz)} – {formatTimeInTz(nextShift.end_datetime, nextTz)}
            </div>
            {nextFacility.address && (
              <div className="text-[13px] text-[hsl(var(--m-text-muted))] mt-1">{nextFacility.address}</div>
            )}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <a
                href={nextFacility.address ? `https://maps.google.com/?q=${encodeURIComponent(nextFacility.address)}` : "#"}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-[hsl(var(--m-accent))] text-[hsl(var(--m-primary))] text-[11px] font-medium"
              >
                <Navigation className="h-4 w-4" /> Directions
              </a>
              <button
                type="button"
                onClick={() => navigate(`/facilities/${nextFacility.id}`)}
                className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-[hsl(var(--m-accent))] text-[hsl(var(--m-primary))] text-[11px] font-medium"
              >
                <Phone className="h-4 w-4" /> Call
              </button>
              <button
                type="button"
                onClick={() => navigate(`/facilities/${nextFacility.id}`)}
                className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-[hsl(var(--m-accent))] text-[hsl(var(--m-primary))] text-[11px] font-medium"
              >
                <FileText className="h-4 w-4" /> Notes
              </button>
            </div>
          </div>
        ) : (
          <MobileEmptyState
            icon={CalendarDays}
            compact
            title="No upcoming shifts"
            description="Add a shift to see it here with directions and clinic notes."
            actionLabel="Add shift"
            onAction={() => setAddShift(true)}
          />
        )}
      </section>

      {/* Needs attention */}
      {attention.length > 0 && (
        <section className="m-section">
          <div className="m-section-label">Needs attention</div>
          <div className="mobile-card divide-y divide-[hsl(var(--m-border))]">
            {attention.map((a) => (
              <button
                key={a.key}
                onClick={a.action}
                className="m-press w-full text-left flex items-start gap-3 p-4 min-h-[var(--m-tap)]"
              >
                <AlertCircle className="h-4 w-4 mt-0.5 text-[hsl(var(--m-warning))] shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-[hsl(var(--m-text))]" style={{ fontSize: "var(--m-text-base)" }}>{a.title}</div>
                  <div className="m-caption mt-0.5 truncate">{a.meta}</div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Business snapshot */}
      <section className="m-section">
        <div className="m-section-label">Business snapshot</div>
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
        onSave={async (s: Omit<Shift, 'id'>) => {
          await addShiftMut(s);
          setAddShift(false);
        }}
      />
    </div>
  );
}
