import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Navigation, Phone, MessageSquare, Pencil } from "lucide-react";
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
      <div className="p-5">
        <button onClick={() => navigate(-1)} className="text-[14px] text-[hsl(var(--m-primary))]">‹ Back</button>
        <div className="mt-6 text-[14px] text-[hsl(var(--m-text-muted))]">Clinic not found.</div>
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
      <header className="px-5 pt-safe pb-2 flex items-center gap-2">
        <button onClick={() => navigate(-1)} aria-label="Back" className="h-9 w-9 rounded-full flex items-center justify-center text-[hsl(var(--m-text))]">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-[18px] font-semibold truncate">{fac.name}</div>
      </header>

      <div className="px-5 mt-2 space-y-4">
        {nextShift && (
          <div className="mobile-card p-4">
            <div className="text-[11px] uppercase tracking-wide font-semibold text-[hsl(var(--m-text-muted))]">Next shift</div>
            <div className="text-[15px] font-semibold mt-1">
              {formatDateInTz(nextShift.start_datetime, tz, "EEE, MMM d")}
            </div>
            <div className="text-[13px] text-[hsl(var(--m-text-muted))]">
              {formatTimeInTz(nextShift.start_datetime, tz)} – {formatTimeInTz(nextShift.end_datetime, tz)}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <a href={mapsHref || "#"} target="_blank" rel="noreferrer" className="mobile-card flex flex-col items-center gap-1 py-3 text-[12px] font-medium text-[hsl(var(--m-primary))]">
            <Navigation className="h-4 w-4" /> Directions
          </a>
          <a href={phone ? `tel:${phone}` : "#"} className="mobile-card flex flex-col items-center gap-1 py-3 text-[12px] font-medium text-[hsl(var(--m-primary))]">
            <Phone className="h-4 w-4" /> Call
          </a>
          <a href={phone ? `sms:${phone}` : "#"} className="mobile-card flex flex-col items-center gap-1 py-3 text-[12px] font-medium text-[hsl(var(--m-primary))]">
            <MessageSquare className="h-4 w-4" /> Text
          </a>
        </div>

        {fac.address && (
          <div className="mobile-card p-4">
            <div className="text-[11px] uppercase tracking-wide font-semibold text-[hsl(var(--m-text-muted))] mb-1">Address</div>
            <div className="text-[14px]">{fac.address}</div>
          </div>
        )}

        {facContacts.length > 0 && (
          <div className="mobile-card p-4">
            <div className="text-[11px] uppercase tracking-wide font-semibold text-[hsl(var(--m-text-muted))] mb-2">Contacts</div>
            <ul className="space-y-2">
              {facContacts.map((c) => (
                <li key={c.id} className="text-[14px]">
                  <div className="font-medium">{c.name} <span className="text-[12px] text-[hsl(var(--m-text-muted))] font-normal">{c.role}</span></div>
                  {c.phone && <div className="text-[13px] text-[hsl(var(--m-text-muted))]">{c.phone}</div>}
                  {c.email && <div className="text-[13px] text-[hsl(var(--m-text-muted))]">{c.email}</div>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {facTerms && (facTerms.weekday_rate || facTerms.weekend_rate) && (
          <div className="mobile-card p-4">
            <div className="text-[11px] uppercase tracking-wide font-semibold text-[hsl(var(--m-text-muted))] mb-1">Rate</div>
            <div className="text-[14px]">
              {facTerms.weekday_rate ? `Weekday $${facTerms.weekday_rate}` : null}
              {facTerms.weekday_rate && facTerms.weekend_rate ? " · " : null}
              {facTerms.weekend_rate ? `Weekend $${facTerms.weekend_rate}` : null}
            </div>
          </div>
        )}

        {fac.notes && (
          <div className="mobile-card p-4">
            <div className="text-[11px] uppercase tracking-wide font-semibold text-[hsl(var(--m-text-muted))] mb-1">Notes</div>
            <div className="text-[14px] whitespace-pre-wrap">{fac.notes}</div>
          </div>
        )}

        <button
          onClick={() => navigate(`/facilities/${fac.id}?setup=1`)}
          className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-full bg-[hsl(var(--m-primary))] text-[hsl(var(--m-primary-fg))] font-semibold"
        >
          <Pencil className="h-4 w-4" /> Edit clinic
        </button>
      </div>
    </div>
  );
}
