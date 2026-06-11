import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { MobilePageHeader } from "@/components/mobile/MobilePageHeader";
import { MobileMetricCard } from "@/components/mobile/MobileMetricCard";
import { MobileEmptyState } from "@/components/mobile/MobileEmptyState";
import { MobileMetricsSkeleton, Skeleton } from "@/components/mobile/MobileSkeleton";
import { useData } from "@/contexts/DataContext";
import { useExpenses } from "@/hooks/useExpenses";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);
}

function MonthlyRevenueBars({ values }: { values: number[] }) {
  const w = 320, h = 120, padX = 10, padY = 6;
  const max = Math.max(1, ...values);
  const barCount = values.length;
  const gap = 4;
  const barW = barCount > 0 ? Math.max(4, (w - padX * 2 - gap * (barCount - 1)) / barCount) : 0;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[120px]">
      {/* Grid line */}
      <line x1={padX} y1={h - padY - (0.5 * (h - padY * 2))} x2={w - padX} y2={h - padY - (0.5 * (h - padY * 2))} stroke="hsl(var(--m-border))" strokeDasharray="2,2" />
      {values.map((v, i) => {
        const x = padX + i * (barW + gap);
        const barH = (v / max) * (h - padY * 2);
        const y = h - padY - barH;
        const isMax = v === max && max > 0;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={3} fill={isMax ? "hsl(var(--m-primary))" : "hsl(var(--m-accent))"} opacity={isMax ? 1 : 0.8} />
          </g>
        );
      })}
    </svg>
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);
}

export function MobileInsightsPage() {
  const { invoices, facilities, shifts, payments, getComputedInvoiceStatus, dataLoading } = useData();
  const { expenses, loading: expensesLoading } = useExpenses();
  const isLoading = dataLoading || expensesLoading;

  const monthKey = new Date().toISOString().slice(0, 7);
  const monthShifts = shifts.filter((s) => s.start_datetime.startsWith(monthKey) && +new Date(s.start_datetime) <= Date.now());
  const revenue = monthShifts.reduce((s, sh) => s + (Number(sh.rate_applied) || 0) + Number(sh.overtime_hours || 0) * Number(sh.overtime_rate || 0), 0);
  const paid = payments.filter((p) => p.payment_date.startsWith(monthKey)).reduce((s, p) => s + Number(p.amount || 0), 0);
  const outstanding = invoices.reduce((s, i) => {
    const st = getComputedInvoiceStatus(i) as string;
    if (["sent", "partial", "overdue"].includes(st)) return s + Number(i.balance_due || 0);
    return s;
  }, 0);
  const monthExp = expenses.filter((e) => e.expense_date.startsWith(monthKey)).reduce((s, e) => s + e.amount_cents, 0) / 100;
  const monthMiles = expenses.filter((e) => e.expense_date.startsWith(monthKey) && e.mileage_miles).reduce((s, e) => s + Number(e.mileage_miles || 0), 0);

  // 6-month revenue trend
  const trend = useMemo(() => {
    const now = new Date();
    const months: { key: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const total = shifts
        .filter((s) => s.start_datetime.startsWith(key))
        .reduce((sum, s) => sum + (Number(s.rate_applied) || 0), 0);
      months.push({ key, total });
    }
    return months;
  }, [shifts]);

  const topClinics = useMemo(() => {
    const map = new Map<string, number>();
    monthShifts.forEach((s) => map.set(s.facility_id, (map.get(s.facility_id) ?? 0) + (Number(s.rate_applied) || 0)));
    return Array.from(map.entries())
      .map(([fid, total]) => ({ facility: facilities.find((f) => f.id === fid), total }))
      .filter((r) => r.facility)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [monthShifts, facilities]);

  if (isLoading) {
    return (
      <div>
        <MobilePageHeader title="Insights" subtitle="See how the business is performing." />
        <div className="px-5 mt-3">
          <MobileMetricsSkeleton count={4} />
        </div>
        <div className="px-5 mt-5">
          <Skeleton h={10} w={90} className="mb-2" />
          <div className="mobile-card p-3"><Skeleton h={80} /></div>
        </div>
        <div className="px-5 mt-5">
          <Skeleton h={10} w={90} className="mb-2" />
          <div className="mobile-card p-4 space-y-3">
            <Skeleton h={12} w="70%" />
            <Skeleton h={12} w="55%" />
            <Skeleton h={12} w="60%" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <MobilePageHeader title="Insights" subtitle="See how the business is performing." />

      <div className="px-5">
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-[hsl(var(--m-card))] border border-[hsl(var(--m-border))] text-[12px] font-medium text-[hsl(var(--m-text-muted))]">
          This month
        </span>
      </div>

      <div className="px-5 mt-3 grid grid-cols-2 gap-3">
        <MobileMetricCard label="Revenue" value={fmt(revenue)} tone="primary" />
        <MobileMetricCard label="Paid" value={fmt(paid)} tone="default" />
        <MobileMetricCard label="Outstanding" value={fmt(outstanding)} tone="warning" />
        <MobileMetricCard label="Expenses" value={fmt(monthExp)} />
      </div>

      <section className="px-5 mt-5">
        <div className="text-[11px] uppercase tracking-wide font-semibold text-[hsl(var(--m-text-muted))] mb-2">
          Revenue trend
        </div>
        <div className="mobile-card p-3">
          <Sparkline values={trend.map((t) => t.total)} />
          <div className="mt-2 grid grid-cols-6 gap-1 text-center text-[10px] text-[hsl(var(--m-text-muted))]">
            {trend.map((t) => (
              <div key={t.key}>{t.key.slice(5)}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 mt-5">
        <div className="text-[11px] uppercase tracking-wide font-semibold text-[hsl(var(--m-text-muted))] mb-2">
          Top clinics
        </div>
        <div className="mobile-card divide-y divide-[hsl(var(--m-border))]">
          {topClinics.length === 0 ? (
            <div className="p-5 text-center text-[13px] text-[hsl(var(--m-text-muted))]">
              No revenue yet this month. Completed shifts will show up here.
            </div>
          ) : (
            topClinics.map(({ facility, total }) => (
              <div key={facility!.id} className="p-4 flex items-center justify-between">
                <div className="text-[14px] font-medium truncate pr-3">{facility!.name}</div>
                <div className="text-[14px] font-semibold">{fmt(total)}</div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="px-5 mt-5 mb-2">
        <div className="text-[11px] uppercase tracking-wide font-semibold text-[hsl(var(--m-text-muted))] mb-2">
          Mileage
        </div>
        <div className="mobile-card p-4">
          <div className="font-semibold tabular-nums" style={{ fontSize: "var(--m-text-2xl)" }}>{Math.round(monthMiles)} mi</div>
          <div className="m-caption mt-0.5">This month</div>
        </div>
      </section>
    </div>
  );
}
