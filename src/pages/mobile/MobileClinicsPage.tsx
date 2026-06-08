import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { MobilePageHeader } from "@/components/mobile/MobilePageHeader";
import { MobileFab } from "@/components/mobile/MobileFab";
import { useData } from "@/contexts/DataContext";
import { AddFacilityDialog } from "@/components/AddFacilityDialog";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { resolveShiftTz } from "@/lib/resolveTimezone";
import { formatDateInTz, formatTimeInTz } from "@/lib/tzTime";

export function MobileClinicsPage() {
  const navigate = useNavigate();
  const { facilities, shifts } = useData();
  const { profile } = useUserProfile();
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const list = useMemo(() => {
    const now = Date.now();
    const term = q.trim().toLowerCase();
    return facilities
      .filter((f) => f.status === "active")
      .filter((f) => (term ? f.name.toLowerCase().includes(term) || (f.address || "").toLowerCase().includes(term) : true))
      .map((f) => {
        const facShifts = shifts.filter((s) => s.facility_id === f.id);
        const next = facShifts
          .filter((s) => +new Date(s.start_datetime) >= now)
          .sort((a, b) => +new Date(a.start_datetime) - +new Date(b.start_datetime))[0];
        const last = facShifts
          .filter((s) => +new Date(s.start_datetime) < now)
          .sort((a, b) => +new Date(b.start_datetime) - +new Date(a.start_datetime))[0];
        const ref = next ?? last;
        const tz = ref ? resolveShiftTz(ref as any, f as any, profile as any) : f.timezone || "America/New_York";
        const refLabel = next
          ? `Next shift: ${formatDateInTz(next.start_datetime, tz, "EEE, MMM d")} · ${formatTimeInTz(next.start_datetime, tz)} – ${formatTimeInTz(next.end_datetime, tz)}`
          : last
          ? `Last worked: ${formatDateInTz(last.start_datetime, tz, "EEE, MMM d")}`
          : "No shifts yet";
        return { f, refLabel, hasNext: !!next };
      });
  }, [facilities, shifts, q, profile]);

  return (
    <div>
      <MobilePageHeader title="Clinics" subtitle="Add and manage your clinics." />

      <div className="px-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--m-text-muted))]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search clinics"
            className="w-full pl-9 pr-3 py-2.5 rounded-full bg-[hsl(var(--m-card))] border border-[hsl(var(--m-border))] text-[14px] focus:outline-none focus:border-[hsl(var(--m-primary))]"
          />
        </div>
      </div>

      <div className="px-5 mt-4 space-y-2">
        {list.length === 0 && (
          <div className="mobile-card p-5 text-center text-[14px] text-[hsl(var(--m-text-muted))]">
            No clinics yet. Add your first one.
          </div>
        )}
        {list.map(({ f, refLabel, hasNext }) => (
          <button
            key={f.id}
            onClick={() => navigate(`/facilities/${f.id}`)}
            className="mobile-card w-full text-left p-4"
          >
            <div className="text-[15px] font-semibold text-[hsl(var(--m-text))]">{f.name}</div>
            {f.address && (
              <div className="text-[12px] text-[hsl(var(--m-text-muted))] mt-0.5 truncate">{f.address}</div>
            )}
            <div className={"text-[12px] mt-1 " + (hasNext ? "text-[hsl(var(--m-primary))]" : "text-[hsl(var(--m-text-muted))]")}>
              {refLabel}
            </div>
          </button>
        ))}
      </div>

      <MobileFab label="Add clinic" onClick={() => setAddOpen(true)} />
      <AddFacilityDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
