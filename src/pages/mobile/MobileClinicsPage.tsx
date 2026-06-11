import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Building2, Plus, AlertTriangle } from "lucide-react";
import { MobilePageHeader } from "@/components/mobile/MobilePageHeader";
import { MobileEmptyState } from "@/components/mobile/MobileEmptyState";
import { MobileListSkeleton } from "@/components/mobile/MobileSkeleton";
import { useData } from "@/contexts/DataContext";
import { AddFacilityDialog } from "@/components/AddFacilityDialog";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { resolveShiftTz } from "@/lib/resolveTimezone";
import { formatDateInTz, formatTimeInTz } from "@/lib/tzTime";
import { getEngagementPill } from "@/lib/engagementOptions";
import { cn } from "@/lib/utils";

type FilterKey = "all" | "direct" | "platform" | "attention";

export function MobileClinicsPage() {
  const navigate = useNavigate();
  const { facilities, shifts, terms, contacts, dataLoading } = useData();
  const { profile } = useUserProfile();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [addOpen, setAddOpen] = useState(false);

  const enriched = useMemo(() => {
    const now = Date.now();
    return facilities
      .filter((f) => f.status === "active")
      .map((f) => {
        const isDirect = (f.engagement_type || "direct") === "direct";
        const t = terms.find((x) => x.facility_id === f.id);
        const facShifts = shifts.filter((s) => s.facility_id === f.id);
        const next = facShifts
          .filter((s) => +new Date(s.start_datetime) >= now)
          .sort((a, b) => +new Date(a.start_datetime) - +new Date(b.start_datetime))[0];
        const tz = next ? resolveShiftTz(next as any, f as any, profile as any) : f.timezone || "America/New_York";
        const hasBilling = !!(f.invoice_name_to?.trim() && f.invoice_email_to?.trim());
        const hasRate = !!(t && (t.weekday_rate || t.weekend_rate || (t.custom_rates?.length || 0) > 0));
        const facContacts = contacts.filter((c) => c.facility_id === f.id);
        const primaryContact = facContacts.find((c) => c.is_primary) || facContacts[0];
        const attention: string[] = [];
        if (isDirect && f.generates_invoices !== false && !hasBilling) attention.push("Missing billing contact");
        if (!hasRate) attention.push("No rate set");
        if (!next) attention.push("No upcoming shifts");
        const rateLabel = t?.weekday_rate
          ? `$${t.weekday_rate.toLocaleString()}/day`
          : t?.weekend_rate
          ? `$${t.weekend_rate.toLocaleString()}/day`
          : null;
        return { f, isDirect, next, tz, hasBilling, attention, rateLabel, primaryContact };
      });
  }, [facilities, shifts, terms, contacts, profile]);

  const stats = useMemo(
    () => ({
      total: enriched.length,
      direct: enriched.filter((e) => e.isDirect).length,
      platform: enriched.filter((e) => !e.isDirect).length,
      attention: enriched.filter((e) => e.attention.length > 0).length,
    }),
    [enriched],
  );

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return enriched.filter((e) => {
      if (filter === "direct" && !e.isDirect) return false;
      if (filter === "platform" && e.isDirect) return false;
      if (filter === "attention" && e.attention.length === 0) return false;
      if (term && !e.f.name.toLowerCase().includes(term) && !(e.f.address || "").toLowerCase().includes(term)) return false;
      return true;
    });
  }, [enriched, filter, q]);

  return (
    <div>
      <MobilePageHeader title="Clinics" subtitle="Your clinic network at a glance." />

      <div className="m-page">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--m-text-muted))]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search clinics"
            className="w-full pl-9 pr-3 min-h-[44px] rounded-full bg-[hsl(var(--m-card))] border border-[hsl(var(--m-border))] focus:outline-none focus:border-[hsl(var(--m-primary))]"
            style={{ fontSize: "var(--m-text-md)" }}
          />
        </div>

        <div className="-mx-4 px-4 overflow-x-auto">
          <div className="flex gap-1.5 min-w-min">
            <Chip label={`All (${stats.total})`} active={filter === "all"} onClick={() => setFilter("all")} />
            <Chip label={`Direct (${stats.direct})`} active={filter === "direct"} onClick={() => setFilter("direct")} />
            <Chip label={`Platform (${stats.platform})`} active={filter === "platform"} onClick={() => setFilter("platform")} />
            <Chip label={`Needs action (${stats.attention})`} active={filter === "attention"} onClick={() => setFilter("attention")} attention />
          </div>
        </div>

        <div className="flex flex-col gap-2 pb-24">
          {dataLoading ? (
            <MobileListSkeleton count={5} lines={2} />
          ) : list.length === 0 ? (
            q.trim() ? (
              <MobileEmptyState icon={Search} title="No matches" description={`No clinics match "${q.trim()}".`} />
            ) : (
              <MobileEmptyState
                icon={Building2}
                title="No clinics yet"
                description="Add your first clinic to start tracking shifts, contacts, and rates."
                actionLabel="Add clinic"
                onAction={() => setAddOpen(true)}
              />
            )
          ) : null}
          {list.map(({ f, isDirect, next, tz, rateLabel, primaryContact, attention, hasBilling }) => {
            const pill = getEngagementPill(f);
            return (
              <button
                key={f.id}
                onClick={() => navigate(`/facilities/${f.id}`)}
                className="mobile-card m-press w-full text-left p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[hsl(var(--m-text))] truncate" style={{ fontSize: "var(--m-text-md)" }}>{f.name}</div>
                    {f.address && <div className="m-caption mt-0.5 truncate">{f.address}</div>}
                  </div>
                  <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0", pill.className)}>
                    {pill.label}
                  </span>
                </div>

                <div className="mt-3 space-y-1 text-[13px]">
                  <div>
                    <span className="text-[hsl(var(--m-text-muted))]">Next: </span>
                    {next ? (
                      <span className="text-[hsl(var(--m-text))]">
                        {formatDateInTz(next.start_datetime, tz, "EEE, MMM d")} · {formatTimeInTz(next.start_datetime, tz)}
                      </span>
                    ) : (
                      <span className="text-[hsl(var(--m-text-muted))]">No shifts scheduled</span>
                    )}
                  </div>
                  {rateLabel && (
                    <div><span className="text-[hsl(var(--m-text-muted))]">Rate: </span>{rateLabel}</div>
                  )}
                  <div>
                    <span className="text-[hsl(var(--m-text-muted))]">Contact: </span>
                    {primaryContact?.name || (hasBilling ? f.invoice_name_to : isDirect ? <span className="text-amber-700 dark:text-amber-300">Missing billing contact</span> : "—")}
                  </div>
                </div>

                {attention[0] && (
                  <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-800 dark:text-amber-200 bg-amber-100/70 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-900/50 rounded-full px-2 py-0.5">
                    <AlertTriangle className="h-3 w-3" /> {attention[0]}
                    {attention.length > 1 && <span className="opacity-70">+{attention.length - 1}</span>}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={() => setAddOpen(true)}
        className="fixed right-4 bottom-24 z-30 h-14 w-14 rounded-full bg-[hsl(var(--m-primary))] text-[hsl(var(--m-primary-fg))] shadow-lg flex items-center justify-center m-press"
        aria-label="Add clinic"
      >
        <Plus className="h-6 w-6" />
      </button>

      <AddFacilityDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

function Chip({ label, active, onClick, attention }: { label: string; active: boolean; onClick: () => void; attention?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 inline-flex items-center rounded-full border px-3 h-8 text-xs font-medium transition-colors",
        active
          ? attention
            ? "bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-200"
            : "bg-[hsl(var(--m-primary))] text-[hsl(var(--m-primary-fg))] border-[hsl(var(--m-primary))]"
          : "bg-[hsl(var(--m-card))] border-[hsl(var(--m-border))] text-[hsl(var(--m-text-muted))]",
      )}
    >
      {label}
    </button>
  );
}
