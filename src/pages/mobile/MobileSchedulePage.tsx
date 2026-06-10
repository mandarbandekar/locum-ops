import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil } from "lucide-react";
import { MobilePageHeader } from "@/components/mobile/MobilePageHeader";
import { MobileFab } from "@/components/mobile/MobileFab";
import { MobileStatusChip } from "@/components/mobile/MobileStatusChip";
import { useData } from "@/contexts/DataContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { ShiftFormDialog } from "@/components/schedule/ShiftFormDialog";
import { resolveShiftTz } from "@/lib/resolveTimezone";
import { formatDateInTz, formatTimeInTz } from "@/lib/tzTime";
import type { Shift } from "@/types";

function monthKeyFromDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function MobileSchedulePage() {
  const navigate = useNavigate();
  const { facilities, shifts, terms, invoices, lineItems, getComputedInvoiceStatus, addShift: addShiftMut, updateShift, deleteShift } = useData();
  const { profile } = useUserProfile();
  const [cursor, setCursor] = useState(() => new Date());
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);

  const monthKey = monthKeyFromDate(cursor);
  const monthShifts = useMemo(() => {
    return [...shifts]
      .filter((s) => s.start_datetime.startsWith(monthKey))
      .sort((a, b) => +new Date(a.start_datetime) - +new Date(b.start_datetime));
  }, [shifts, monthKey]);

  const groups = useMemo(() => {
    const map = new Map<string, Shift[]>();
    for (const s of monthShifts) {
      const fac = facilities.find((f) => f.id === s.facility_id);
      const tz = resolveShiftTz(s as any, fac as any, profile as any);
      const ymd = formatDateInTz(s.start_datetime, tz, "yyyy-MM-dd");
      if (!map.has(ymd)) map.set(ymd, []);
      map.get(ymd)!.push(s);
    }
    return Array.from(map.entries());
  }, [monthShifts, facilities, profile]);

  function invoiceStatusFor(shiftId: string): string | null {
    const li = lineItems.find((l) => l.shift_id === shiftId);
    if (!li) return null;
    const inv = invoices.find((i) => i.id === li.invoice_id);
    if (!inv) return null;
    return getComputedInvoiceStatus(inv) as string;
  }

  return (
    <div>
      <MobilePageHeader title="Schedule" subtitle="See and edit upcoming shifts." />

      <div className="m-gutter flex items-center justify-between">
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

      <div className="px-5 mt-3 space-y-5">
        {groups.length === 0 && (
          <div className="mobile-card p-5 text-center text-[14px] text-[hsl(var(--m-text-muted))]">
            No shifts this month.
          </div>
        )}
        {groups.map(([ymd, items]) => {
          const [y, m, d] = ymd.split("-").map(Number);
          const dateLabel = new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
          return (
            <div key={ymd}>
              <div className="text-[11px] uppercase tracking-wide font-semibold text-[hsl(var(--m-text-muted))] mb-2">
                {dateLabel}
              </div>
              <div className="space-y-2">
                {items.map((s) => {
                  const fac = facilities.find((f) => f.id === s.facility_id);
                  const tz = resolveShiftTz(s as any, fac as any, profile as any);
                  const status = invoiceStatusFor(s.id);
                  return (
                    <div key={s.id} className="mobile-card m-press p-4 flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-[hsl(var(--m-text))] truncate" style={{ fontSize: "var(--m-text-md)" }}>{fac?.name ?? "Clinic"}</div>
                        <div className="m-caption mt-0.5">
                          {formatTimeInTz(s.start_datetime, tz)} – {formatTimeInTz(s.end_datetime, tz)}
                        </div>
                        {status && (
                          <div className="mt-2">
                            <MobileStatusChip status={status} />
                          </div>
                        )}
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
                })}
              </div>
            </div>
          );
        })}
      </div>

      <MobileFab label="Add shift" onClick={() => setAddOpen(true)} />

      <ShiftFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        facilities={facilities}
        shifts={shifts}
        terms={terms}
        onSave={async (s: Omit<Shift, "id">) => { await addShiftMut(s); setAddOpen(false); }}
      />
      <ShiftFormDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        facilities={facilities}
        shifts={shifts}
        terms={terms}
        existing={editing ?? undefined}
        onSave={async (s: Shift) => { await updateShift(s); setEditing(null); }}
        onDelete={async (id: string) => { await deleteShift(id); setEditing(null); }}
      />
    </div>
  );
}
