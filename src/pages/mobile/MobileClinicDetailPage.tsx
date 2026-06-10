import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Navigation, Phone, MessageSquare, Pencil } from "lucide-react";
import { MobilePageHeader } from "@/components/mobile/MobilePageHeader";
import { useData } from "@/contexts/DataContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { resolveShiftTz } from "@/lib/resolveTimezone";
import { formatDateInTz, formatTimeInTz } from "@/lib/tzTime";

export function MobileClinicDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { facilities, contacts, terms, shifts } = useData();
  const { profile } = useUserProfile();
  const fac = facilities.find((f) => f.id === id);

  const nextShift = useMemo(() => {
    if (!fac) return null;
    const now = Date.now();
    return shifts
      .filter((s) => s.facility_id === fac.id && +new Date(s.start_datetime) >= now)
      .sort((a, b) => +new Date(a.start_datetime) - +new Date(b.start_datetime))[0] ?? null;
  }, [shifts, fac]);

  if (!fac) {
    return (
      <div>
        <MobilePageHeader title="Clinic" onBack={() => navigate(-1)} showProfile={false} compact />
        <div className="m-gutter mt-6 m-body text-[hsl(var(--m-text-muted))]">Clinic not found.</div>
      </div>
    );
  }

  const billing = contacts.find((c) => c.facility_id === fac.id && /billing|billing/i.test(c.role)) ?? contacts.find((c) => c.facility_id === fac.id);
  const facContacts = contacts.filter((c) => c.facility_id === fac.id);
  const facTerms = terms.find((t) => t.facility_id === fac.id);
  const tz = nextShift ? resolveShiftTz(nextShift as any, fac as any, profile as any) : fac.timezone || "America/New_York";

  const mapsHref = fac.address ? `https://maps.google.com/?q=${encodeURIComponent(fac.address)}` : undefined;
  const phone = (billing?.phone || facContacts[0]?.phone || "").replace(/\s+/g, "");

  return (
    <div>
      <MobilePageHeader
        title={fac.name}
        onBack={() => navigate(-1)}
        showProfile={false}
        compact
      />

      <div className="m-gutter mt-2 space-y-3">
        {nextShift && (
          <div className="mobile-card p-4">
            <div className="m-eyebrow">Next shift</div>
            <div className="mt-1 font-semibold" style={{ fontSize: "var(--m-text-md)" }}>
              {formatDateInTz(nextShift.start_datetime, tz, "EEE, MMM d")}
            </div>
            <div className="m-caption">
              {formatTimeInTz(nextShift.start_datetime, tz)} – {formatTimeInTz(nextShift.end_datetime, tz)}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <a href={mapsHref || "#"} target="_blank" rel="noreferrer" className="mobile-card m-press flex flex-col items-center gap-1 py-3 font-medium text-[hsl(var(--m-primary))]" style={{ fontSize: "var(--m-text-xs)" }}>
            <Navigation className="h-4 w-4" /> Directions
          </a>
          <a href={phone ? `tel:${phone}` : "#"} className="mobile-card m-press flex flex-col items-center gap-1 py-3 font-medium text-[hsl(var(--m-primary))]" style={{ fontSize: "var(--m-text-xs)" }}>
            <Phone className="h-4 w-4" /> Call
          </a>
          <a href={phone ? `sms:${phone}` : "#"} className="mobile-card m-press flex flex-col items-center gap-1 py-3 font-medium text-[hsl(var(--m-primary))]" style={{ fontSize: "var(--m-text-xs)" }}>
            <MessageSquare className="h-4 w-4" /> Text
          </a>
        </div>

        {fac.address && (
          <div className="mobile-card p-4">
            <div className="m-eyebrow mb-1">Address</div>
            <div className="m-body">{fac.address}</div>
          </div>
        )}

        {facContacts.length > 0 && (
          <div className="mobile-card p-4">
            <div className="m-eyebrow mb-2">Contacts</div>
            <ul className="space-y-2">
              {facContacts.map((c) => (
                <li key={c.id} className="m-body">
                  <div className="font-medium">{c.name} <span className="m-caption font-normal">{c.role}</span></div>
                  {c.phone && <div className="m-caption">{c.phone}</div>}
                  {c.email && <div className="m-caption truncate">{c.email}</div>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {facTerms && (facTerms.weekday_rate || facTerms.weekend_rate) && (
          <div className="mobile-card p-4">
            <div className="m-eyebrow mb-1">Rate</div>
            <div className="m-body">
              {facTerms.weekday_rate ? `Weekday $${facTerms.weekday_rate}` : null}
              {facTerms.weekday_rate && facTerms.weekend_rate ? " · " : null}
              {facTerms.weekend_rate ? `Weekend $${facTerms.weekend_rate}` : null}
            </div>
          </div>
        )}

        {fac.notes && (
          <div className="mobile-card p-4">
            <div className="m-eyebrow mb-1">Notes</div>
            <div className="m-body whitespace-pre-wrap">{fac.notes}</div>
          </div>
        )}

        <button
          onClick={() => navigate(`/facilities/${fac.id}?setup=1`)}
          className="m-press w-full inline-flex items-center justify-center gap-2 h-12 rounded-full bg-[hsl(var(--m-primary))] text-[hsl(var(--m-primary-fg))] font-semibold"
          style={{ fontSize: "var(--m-text-md)" }}
        >
          <Pencil className="h-4 w-4" /> Edit clinic
        </button>
      </div>
    </div>
  );
}
