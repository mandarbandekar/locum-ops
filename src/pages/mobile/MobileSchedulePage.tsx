import { useMemo, useState, useEffect } from "react";
import { Pencil, CalendarPlus } from "lucide-react";
import { MobilePageHeader } from "@/components/mobile/MobilePageHeader";
import { MobileStatusChip } from "@/components/mobile/MobileStatusChip";
import { MobileEmptyState } from "@/components/mobile/MobileEmptyState";
import { MobileListSkeleton } from "@/components/mobile/MobileSkeleton";
import { useData } from "@/contexts/DataContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { ShiftFormDialog } from "@/components/schedule/ShiftFormDialog";
import { resolveShiftTz } from "@/lib/resolveTimezone";
import { formatDateInTz, formatTimeInTz } from "@/lib/tzTime";
import { cn } from "@/lib/utils";
import type { Shift } from "@/types";

type DayStatus = "confirmed" | "completed" | "event" | "expired";

function ymdLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseYmd(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function buildMonthGrid(cursor: Date) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = first.getDay(); // Sun = 0
  const start = new Date(year, month, 1 - startOffset);
  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    cells.push({ date: d, inMonth: d.getMonth() === month });
  }
  return cells;
}

const DOT_CLASS: Record<DayStatus, string> = {
  confirmed: "bg-[hsl(var(--m-primary))]",
  completed: "bg-slate-300",
  event: "bg-teal-600",
  expired: "bg-rose-300",
};

const FILLED_CLASS: Record<DayStatus, string> = {
  confirmed: "bg-[hsl(var(--m-primary))] text-white",
  completed: "bg-slate-200 text-slate-700",
  event: "bg-teal-600 text-white",
  expired: "bg-rose-100 text-rose-800",
};

export function MobileSchedulePage() {
  const {
    facilities,
    shifts,
    terms,
    invoices,
    lineItems,
    getComputedInvoiceStatus,
    addShift: addShiftMut,
    updateShift,
    deleteShift,
    dataLoading,
  } = useData();
  const { profile } = useUserProfile();
  const calEvents = useCalendarEvents() as any;
  const credentialEvents = calEvents?.credentialEvents ?? [];
  const subscriptionEvents = calEvents?.subscriptionEvents ?? [];

  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<string>(() => ymdLocal(new Date()));
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);

  const todayYmd = ymdLocal(new Date());

  // Bucket shifts by clinic-tz YMD
  const shiftsByDay = useMemo(() => {
    const map = new Map<string, Shift[]>();
    for (const s of shifts) {
      const fac = facilities.find((f) => f.id === s.facility_id);
      const tz = resolveShiftTz(s as any, fac as any, profile as any);
      const ymd = formatDateInTz(s.start_datetime, tz, "yyyy-MM-dd");
      if (!map.has(ymd)) map.set(ymd, []);
      map.get(ymd)!.push(s);
    }
    return map;
  }, [shifts, facilities, profile]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, { status: DayStatus }[]>();
    const push = (d: Date, status: DayStatus) => {
      const k = ymdLocal(d);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push({ status });
    };
    for (const e of credentialEvents) push(e.date as Date, e.status === "expired" ? "expired" : "event");
    for (const e of subscriptionEvents) push(e.date as Date, e.status === "expired" ? "expired" : "event");
    return map;
  }, [credentialEvents, subscriptionEvents]);

  // Priority: expired > confirmed > event > completed
  const statusByDay = useMemo(() => {
    const map = new Map<string, DayStatus>();
    for (const [ymd] of shiftsByDay.entries()) {
      map.set(ymd, ymd < todayYmd ? "completed" : "confirmed");
    }
    for (const [ymd, list] of eventsByDay.entries()) {
      const hasExpired = list.some((x) => x.status === "expired");
      const existing = map.get(ymd);
      if (hasExpired) map.set(ymd, "expired");
      else if (!existing) map.set(ymd, "event");
    }
    return map;
  }, [shiftsByDay, eventsByDay, todayYmd]);

  function invoiceStatusFor(shiftId: string): string | null {
    const li = lineItems.find((l) => l.shift_id === shiftId);
    if (!li) return null;
    const inv = invoices.find((i) => i.id === li.invoice_id);
    if (!inv) return null;
    return getComputedInvoiceStatus(inv) as string;
  }

  const cells = useMemo(() => buildMonthGrid(cursor), [cursor]);

  // Keep selection inside the visible month
  useEffect(() => {
    const sel = parseYmd(selected);
    if (sel.getMonth() !== cursor.getMonth() || sel.getFullYear() !== cursor.getFullYear()) {
      const monthKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
      const candidate = Array.from(shiftsByDay.keys()).filter((k) => k.startsWith(monthKey)).sort()[0];
      setSelected(candidate ?? `${monthKey}-01`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor]);

  const selectedShifts = shiftsByDay.get(selected) ?? [];
  const selectedDate = parseYmd(selected);
  const selectedLabel = selectedDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const legend: { label: string; status: DayStatus }[] = [
    { label: "Confirmed", status: "confirmed" },
    { label: "Completed", status: "completed" },
    { label: "Event", status: "event" },
    { label: "Expired", status: "expired" },
  ];

  return (
    <div>
      <MobilePageHeader title="Schedule" subtitle="Tap a date to see that day's shift." />

      {/* Legend */}
      <div className="px-5 mt-1 flex items-center gap-4 overflow-x-auto no-scrollbar pb-1">
        {legend.map((l) => (
          <div key={l.status} className="flex items-center gap-1.5 shrink-0">
            <span className={cn("h-2.5 w-2.5 rounded-full", DOT_CLASS[l.status])} />
            <span className="text-[12px] text-[hsl(var(--m-text))]">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Month nav */}
      <div className="m-gutter mt-3 flex items-center justify-between">
        <button
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          aria-label="Previous month"
          className="m-tap m-press rounded-full flex items-center justify-center text-[hsl(var(--m-text-muted))]"
        >
          ‹
        </button>
        <div className="font-semibold text-[hsl(var(--m-text))]" style={{ fontSize: "var(--m-text-md)" }}>
          {cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </div>
        <button
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          aria-label="Next month"
          className="m-tap m-press rounded-full flex items-center justify-center text-[hsl(var(--m-text-muted))]"
        >
          ›
        </button>
      </div>

      {/* Calendar grid */}
      <div className="px-3 mt-2">
        <div className="grid grid-cols-7 text-[11px] font-semibold text-[hsl(var(--m-text-muted))] mb-1">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} className="h-7 flex items-center justify-center">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map(({ date, inMonth }) => {
            const ymd = ymdLocal(date);
            const status = statusByDay.get(ymd);
            const isToday = ymd === todayYmd;
            const isSelected = ymd === selected;
            return (
              <button
                key={ymd}
                onClick={() => setSelected(ymd)}
                className={cn("h-11 flex items-center justify-center m-press", !inMonth && "opacity-30")}
                aria-label={date.toDateString()}
                aria-pressed={isSelected}
              >
                <span
                  className={cn(
                    "h-9 w-9 rounded-full inline-flex items-center justify-center text-[14px]",
                    status ? FILLED_CLASS[status] : "text-[hsl(var(--m-text))]",
                    isToday && !status && "underline underline-offset-4 decoration-2",
                    isSelected && "ring-2 ring-offset-2 ring-offset-[hsl(var(--m-bg))] ring-[hsl(var(--m-primary))]"
                  )}
                >
                  {date.getDate()}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected-day panel header */}
      <div className="mt-4 border-t border-[hsl(var(--m-border))] bg-[hsl(var(--m-surface-2))]">
        <div className="px-5 py-3 font-semibold text-[hsl(var(--m-text))]">{selectedLabel}</div>
      </div>

      <div className="px-5 mt-3 space-y-2 pb-28">
        {dataLoading ? (
          <MobileListSkeleton count={2} lines={2} />
        ) : selectedShifts.length === 0 ? (
          <MobileEmptyState
            icon={CalendarPlus}
            title="No shifts on this day"
            description="Tap below to add a shift for this date."
            actionLabel="Add shift"
            onAction={() => setAddOpen(true)}
          />
        ) : (
          selectedShifts.map((s) => {
            const fac = facilities.find((f) => f.id === s.facility_id);
            const tz = resolveShiftTz(s as any, fac as any, profile as any);
            const status = invoiceStatusFor(s.id);
            const total =
              (Number(s.rate_applied) || 0) +
              (Number((s as any).overtime_hours || 0) * Number((s as any).overtime_rate || 0));
            return (
              <div key={s.id} className="mobile-card m-press p-4 flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div
                    className="font-semibold text-[hsl(var(--m-text))] truncate"
                    style={{ fontSize: "var(--m-text-md)" }}
                  >
                    {fac?.name ?? "Clinic"}
                  </div>
                  <div className="m-caption mt-0.5">
                    {formatTimeInTz(s.start_datetime, tz)} – {formatTimeInTz(s.end_datetime, tz)}
                  </div>
                  {(s as any).notes && <div className="m-caption mt-1 line-clamp-2">{(s as any).notes}</div>}
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-[hsl(var(--m-text))]">
                      ${Math.round(total).toLocaleString()}
                    </span>
                    {status && <MobileStatusChip status={status} />}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(s)}
                  aria-label="Edit shift"
                  className="m-tap m-press rounded-full flex items-center justify-center text-[hsl(var(--m-text-muted))] border border-[hsl(var(--m-border))]"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            );
          })
        )}
      </div>

      <ShiftFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        facilities={facilities}
        shifts={shifts}
        terms={terms}
        onSave={async (s: Omit<Shift, "id">) => {
          await addShiftMut(s);
          setAddOpen(false);
        }}
      />
      <ShiftFormDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        facilities={facilities}
        shifts={shifts}
        terms={terms}
        existing={editing ?? undefined}
        onSave={async (s: Shift) => {
          await updateShift(s);
          setEditing(null);
        }}
        onDelete={async (id: string) => {
          await deleteShift(id);
          setEditing(null);
        }}
      />
    </div>
  );
}
