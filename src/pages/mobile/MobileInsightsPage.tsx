import { useMemo } from "react";
import { MobilePageHeader } from "@/components/mobile/MobilePageHeader";
import { MobileMetricCard } from "@/components/mobile/MobileMetricCard";
import { useData } from "@/contexts/DataContext";
import { useExpenses } from "@/hooks/useExpenses";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);
}

function Sparkline({ values }: { values: number[] }) {
  const w = 320, h = 80, pad = 6;
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const span = Math.max(1, max - min);
  const step = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0;
  const pts = values.map((v, i) => {
    const x = pad + i * step;
    const y = h - pad - ((v - min) / span) * (h - pad * 2);
    return `${x},${y}`;
  });
  const path = `M ${pts.join(" L ")}`;
  const area = `M ${pad},${h - pad} L ${pts.join(" L ")} L ${pad + step * (values.length - 1)},${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20">
      <path d={area} fill="hsl(var(--m-accent))" opacity={0.6} />
      <path d={path} fill="none" stroke="hsl(var(--m-primary))" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MobileInsightsPage() {
  const { invoices, facilities, shifts, payments, getComputedInvoiceStatus } = useData();
  const { expenses } = useExpenses();

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
          {topClinics.length === 0 && <div className="p-4 text-[13px] text-[hsl(var(--m-text-muted))]">No revenue yet this month.</div>}
          {topClinics.map(({ facility, total }) => (
            <div key={facility!.id} className="p-4 flex items-center justify-between">
              <div className="text-[14px] font-medium truncate pr-3">{facility!.name}</div>
              <div className="text-[14px] font-semibold">{fmt(total)}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 mt-5 mb-2">
        <div className="text-[11px] uppercase tracking-wide font-semibold text-[hsl(var(--m-text-muted))] mb-2">
          Mileage
        </div>
        <div className="mobile-card p-4">
          <div className="text-[24px] font-semibold">{Math.round(monthMiles)} mi</div>
          <div className="text-[12px] text-[hsl(var(--m-text-muted))] mt-0.5">This month</div>
        </div>
      </section>
    </div>
  );
}
