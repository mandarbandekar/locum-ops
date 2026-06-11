import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Pencil, Building2, MoreHorizontal, Plus, Mail, Phone, Navigation } from "lucide-react";
import { MobilePageHeader } from "@/components/mobile/MobilePageHeader";
import { MobileEmptyState } from "@/components/mobile/MobileEmptyState";
import { Skeleton } from "@/components/mobile/MobileSkeleton";
import { useData } from "@/contexts/DataContext";
import { useClinicBrief } from "@/components/facilities/brief/useClinicBrief";
import { getEngagementPill } from "@/lib/engagementOptions";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type Tab = "brief" | "schedule" | "payment" | "notes" | "docs";

export function MobileClinicDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { dataLoading } = useData();
  const brief = useClinicBrief(id);
  const [tab, setTab] = useState<Tab>("brief");

  if (dataLoading && !brief) {
    return (
      <div>
        <MobilePageHeader title="Clinic" onBack={() => navigate(-1)} showProfile={false} compact />
        <div className="m-page">
          <div className="mobile-card p-4 space-y-2">
            <Skeleton h={10} w={70} />
            <Skeleton h={16} w="60%" />
            <Skeleton h={12} w="40%" />
          </div>
        </div>
      </div>
    );
  }

  if (!brief) {
    return (
      <div>
        <MobilePageHeader title="Clinic" onBack={() => navigate(-1)} showProfile={false} compact />
        <MobileEmptyState
          icon={Building2}
          title="Clinic not found"
          description="This clinic may have been deleted."
          actionLabel="Back to clinics"
          onAction={() => navigate("/clinics")}
          className="mx-4 mt-6"
        />
      </div>
    );
  }

  const { facility, isDirect } = brief;
  const pill = getEngagementPill(facility);

  return (
    <div className="pb-28">
      <MobilePageHeader title={facility.name} onBack={() => navigate(-1)} showProfile={false} compact />

      <div className="m-page">
        {/* Compact header strip */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium", pill.className)}>
            {pill.label}
          </span>
          {brief.cityState && (
            <span className="text-[hsl(var(--m-text-muted))] text-xs">{brief.cityState}</span>
          )}
        </div>

        {/* Tab strip */}
        <div className="-mx-4 px-4 overflow-x-auto">
          <div className="flex gap-1 min-w-min border-b border-[hsl(var(--m-border))]">
            {(["brief", "schedule", "payment", "notes", "docs"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "shrink-0 capitalize px-3 h-10 text-sm font-medium border-b-2 -mb-px transition-colors",
                  tab === t
                    ? "border-[hsl(var(--m-primary))] text-[hsl(var(--m-text))]"
                    : "border-transparent text-[hsl(var(--m-text-muted))]",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {tab === "brief" && <BriefStack brief={brief} onOpenSetup={() => navigate(`/facilities/${facility.id}?setup=1`)} />}
        {tab === "schedule" && <SchedulePanel facilityId={facility.id} />}
        {tab === "payment" && <PaymentPanel brief={brief} />}
        {tab === "notes" && <NotesPanel brief={brief} />}
        {tab === "docs" && (
          <div className="mobile-card p-4 text-sm text-[hsl(var(--m-text-muted))]">
            Contracts, key terms, and policies live in the desktop view.
            <div className="mt-3">
              <button
                onClick={() => navigate(`/facilities/${facility.id}?setup=1`)}
                className="text-[hsl(var(--m-primary))] font-medium"
              >
                Open full clinic setup
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sticky bottom action bar */}
      <div className="fixed bottom-16 left-0 right-0 z-30 px-4 pb-2 pointer-events-none">
        <div className="m-container pointer-events-auto">
          <div className="mobile-card flex items-center gap-2 p-2">
            <button
              onClick={() => navigate(`/schedule?new=1&facility=${facility.id}`)}
              className="flex-1 m-press inline-flex items-center justify-center gap-1.5 h-11 rounded-full bg-[hsl(var(--m-primary))] text-[hsl(var(--m-primary-fg))] font-semibold text-sm"
            >
              <Plus className="h-4 w-4" /> Add shift
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="m-press h-11 w-11 inline-flex items-center justify-center rounded-full border border-[hsl(var(--m-border))]" aria-label="More">
                  <MoreHorizontal className="h-5 w-5 text-[hsl(var(--m-text))]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/facilities/${facility.id}?setup=1`)}>
                  <Pencil className="h-4 w-4 mr-2" /> Edit clinic
                </DropdownMenuItem>
                {facility.address && (
                  <DropdownMenuItem onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(facility.address)}`, "_blank")}>
                    <Navigation className="h-4 w-4 mr-2" /> Directions
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}

function MCard({ eyebrow, action, children }: { eyebrow: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mobile-card p-4">
      <div className="flex items-center mb-2">
        <div className="m-eyebrow">{eyebrow}</div>
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {children}
    </div>
  );
}

function BriefStack({ brief, onOpenSetup }: { brief: ReturnType<typeof useClinicBrief>; onOpenSetup: () => void }) {
  if (!brief) return null;
  return (
    <div className="flex flex-col gap-3">
      {/* Next shift */}
      <MCard eyebrow="Next shift">
        {brief.nextShift ? (
          <div>
            <div className="font-semibold" style={{ fontSize: "var(--m-text-md)" }}>{brief.nextShiftDateLabel}</div>
            <div className="m-caption">{brief.nextShiftTimeLabel}</div>
            {brief.primaryRateLabel && <div className="m-caption mt-1">{brief.primaryRateLabel}</div>}
            {brief.upcomingCount > 1 && (
              <div className="m-caption mt-1">{brief.upcomingThisMonthCount} upcoming this month</div>
            )}
          </div>
        ) : (
          <div className="text-[hsl(var(--m-text-muted))] text-sm">No upcoming shifts.</div>
        )}
      </MCard>

      {/* Needs attention */}
      {brief.attention.length > 0 && (
        <div className="rounded-2xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/20 p-4">
          <div className="m-eyebrow text-amber-900 dark:text-amber-200">Needs attention</div>
          <ul className="mt-2 space-y-1.5 text-sm">
            {brief.attention.map((a) => (
              <li key={a.id} className="text-amber-900 dark:text-amber-200">
                <span className="font-medium">{a.title}</span>
                {a.hint && <div className="text-xs text-amber-800/80 dark:text-amber-300/80">{a.hint}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Things to remember */}
      <MCard eyebrow="Things to remember" action={
        <button onClick={onOpenSetup} className="text-[hsl(var(--m-primary))] text-xs font-medium">Edit</button>
      }>
        {brief.rememberRows.length === 0 ? (
          <p className="text-sm text-[hsl(var(--m-text-muted))]">Add login details, parking, EMR, or anything to remember.</p>
        ) : (
          <dl className="text-sm space-y-2">
            {brief.rememberRows.map((r) => (
              <div key={r.label}>
                <dt className="m-caption">{r.label}</dt>
                <dd className="whitespace-pre-wrap break-words">{r.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </MCard>

      {/* Payment setup */}
      <PaymentPanel brief={brief} />

      {/* Key contact */}
      <KeyContactPanel brief={brief} />
    </div>
  );
}

function PaymentPanel({ brief }: { brief: ReturnType<typeof useClinicBrief> }) {
  if (!brief) return null;
  const f = brief.facility;
  return (
    <MCard eyebrow="Payment setup">
      {brief.isPlatform ? (
        <dl className="text-sm space-y-1.5">
          <Pair k="Billing" v={`Paid by ${f.source_name?.trim() || "platform"}`} />
          <Pair k="Invoicing" v="No LocumOps invoice needed" />
          {brief.primaryRateLabel && <Pair k="Rate" v={brief.primaryRateLabel} />}
        </dl>
      ) : (
        <dl className="text-sm space-y-1.5">
          <Pair k="Billing" v={brief.billingLabel} />
          {f.invoice_prefix && <Pair k="Prefix" v={f.invoice_prefix} />}
          <Pair
            k="Contact"
            v={
              f.invoice_name_to?.trim() || f.invoice_email_to?.trim() || (
                <span className="text-amber-700 dark:text-amber-300">Missing billing contact</span>
              )
            }
          />
          {brief.primaryRateLabel && <Pair k="Rate" v={brief.primaryRateLabel} />}
        </dl>
      )}
    </MCard>
  );
}

function KeyContactPanel({ brief }: { brief: ReturnType<typeof useClinicBrief> }) {
  if (!brief) return null;
  const c = brief.keyContact;
  return (
    <MCard eyebrow="Key contact">
      {!c ? (
        <p className="text-sm text-[hsl(var(--m-text-muted))]">No contact yet. Add the person you coordinate with.</p>
      ) : (
        <div>
          <div className="font-semibold" style={{ fontSize: "var(--m-text-md)" }}>{c.name}</div>
          {c.role && <div className="m-caption">{c.role}{c.source === "billing" ? " · from billing settings" : ""}</div>}
          <div className="mt-2 space-y-1 text-sm">
            {c.email && (
              <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-[hsl(var(--m-text-muted))]">
                <Mail className="h-3.5 w-3.5" /> <span className="truncate">{c.email}</span>
              </a>
            )}
            {c.phone && (
              <a href={`tel:${c.phone.replace(/\s+/g, "")}`} className="flex items-center gap-2 text-[hsl(var(--m-text-muted))]">
                <Phone className="h-3.5 w-3.5" /> <span>{c.phone}</span>
              </a>
            )}
          </div>
        </div>
      )}
    </MCard>
  );
}

function NotesPanel({ brief }: { brief: ReturnType<typeof useClinicBrief> }) {
  if (!brief) return null;
  return (
    <div className="flex flex-col gap-3">
      <KeyContactPanel brief={brief} />
      <MCard eyebrow="Working notes">
        {brief.rememberRows.length === 0 ? (
          <p className="text-sm text-[hsl(var(--m-text-muted))]">No notes yet.</p>
        ) : (
          <dl className="text-sm space-y-2">
            {brief.rememberRows.map((r) => (
              <div key={r.label}>
                <dt className="m-caption">{r.label}</dt>
                <dd className="whitespace-pre-wrap break-words">{r.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </MCard>
    </div>
  );
}

function SchedulePanel({ facilityId }: { facilityId: string }) {
  const { shifts } = useData();
  const now = Date.now();
  const fac = shifts.filter((s) => s.facility_id === facilityId);
  const upcoming = fac.filter((s) => +new Date(s.start_datetime) >= now).sort((a, b) => +new Date(a.start_datetime) - +new Date(b.start_datetime));
  const past = fac.filter((s) => +new Date(s.start_datetime) < now).sort((a, b) => +new Date(b.start_datetime) - +new Date(a.start_datetime)).slice(0, 6);
  const Row = (s: any) => (
    <div key={s.id} className="flex items-baseline justify-between gap-2 text-sm py-1.5 border-b border-[hsl(var(--m-border))] last:border-0">
      <span>{new Date(s.start_datetime).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
      <span className="m-caption">{new Date(s.start_datetime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
    </div>
  );
  return (
    <div className="flex flex-col gap-3">
      <MCard eyebrow={`Upcoming · ${upcoming.length}`}>
        {upcoming.length === 0 ? <p className="text-sm text-[hsl(var(--m-text-muted))]">No upcoming shifts.</p> : upcoming.slice(0, 8).map(Row)}
      </MCard>
      {past.length > 0 && (
        <MCard eyebrow={`Past · last ${past.length}`}>{past.map(Row)}</MCard>
      )}
    </div>
  );
}

function Pair({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[90px_1fr] gap-3">
      <dt className="m-caption">{k}</dt>
      <dd className="break-words">{v}</dd>
    </div>
  );
}
