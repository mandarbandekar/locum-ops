import { useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { resolveShiftTz } from '@/lib/resolveTimezone';
import { formatDateInTz, formatTimeInTz } from '@/lib/tzTime';
import type { Facility, FacilityContact, Shift, TermsSnapshot } from '@/types';

export type AttentionItem = {
  id: string;
  title: string;
  hint?: string;
  tone?: 'attention' | 'info';
};

export type ClinicBrief = {
  facility: Facility;
  isDirect: boolean;
  isPlatform: boolean;
  engagementLabel: string;
  cityState: string;
  timezone: string;
  /** Next upcoming shift (or null) */
  nextShift: Shift | null;
  nextShiftDateLabel?: string;
  nextShiftTimeLabel?: string;
  upcomingThisMonthCount: number;
  upcomingCount: number;
  /** Display label like "Overnight ER · $3,000/day" */
  primaryRateLabel: string | null;
  /** "Monthly · Net 15" or "Paid by platform" */
  billingLabel: string;
  /** Primary contact (people first, then billing contact info) */
  keyContact: {
    name: string;
    role?: string;
    email?: string;
    phone?: string;
    source: 'contact' | 'billing';
  } | null;
  attention: AttentionItem[];
  /** Has any of structured "things to remember" notes */
  rememberRows: Array<{ label: string; value: string }>;
};

const cadenceLabel = (c: Facility) => {
  const labels: Record<string, string> = {
    daily: 'Daily',
    weekly: 'Weekly',
    biweekly: 'Bi-weekly',
    monthly: 'Monthly',
  };
  return labels[c.billing_cadence] || 'Monthly';
};

function buildPrimaryRateLabel(t?: TermsSnapshot | null): string | null {
  if (!t) return null;
  const fmt = (n: number) => `$${n.toLocaleString()}/day`;
  if (t.weekday_rate) return `Weekday · ${fmt(t.weekday_rate)}`;
  if (t.weekend_rate) return `Weekend · ${fmt(t.weekend_rate)}`;
  if (t.custom_rates?.length) {
    const r = t.custom_rates[0];
    return `${r.label} · $${r.amount.toLocaleString()}${r.kind === 'hourly' ? '/hr' : '/day'}`;
  }
  return null;
}

function cityStateFromAddress(addr: string): string {
  if (!addr) return '';
  // best-effort: take the segment before the zip; pick "City, ST"
  const parts = addr.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const last = parts[parts.length - 1].replace(/\b\d{5}(-\d{4})?\b/, '').trim();
    const tail = last.split(/\s+/).pop() || '';
    if (/^[A-Z]{2}$/.test(tail)) {
      return `${parts[parts.length - 2]}, ${tail}`;
    }
    return parts.slice(-2).join(', ');
  }
  return addr;
}

export function useClinicBrief(facilityId: string | undefined): ClinicBrief | null {
  const { facilities, contacts, terms, shifts } = useData();
  const { profile } = useUserProfile();

  return useMemo(() => {
    if (!facilityId) return null;
    const facility = facilities.find((f) => f.id === facilityId);
    if (!facility) return null;

    const isDirect = (facility.engagement_type || 'direct') === 'direct';
    const isPlatform = !isDirect;
    const t = terms.find((x) => x.facility_id === facility.id) || null;
    const facContacts = contacts.filter((c) => c.facility_id === facility.id);
    const facShifts = shifts.filter((s) => s.facility_id === facility.id);

    const now = Date.now();
    const upcoming = facShifts
      .filter((s) => +new Date(s.start_datetime) >= now)
      .sort((a, b) => +new Date(a.start_datetime) - +new Date(b.start_datetime));
    const nextShift = upcoming[0] || null;
    const tz = nextShift
      ? resolveShiftTz(nextShift as any, facility as any, profile as any)
      : facility.timezone || 'America/New_York';

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    const upcomingThisMonth = upcoming.filter((s) => {
      const d = +new Date(s.start_datetime);
      return d >= +monthStart && d < +monthEnd;
    });

    const engagementLabel = isDirect
      ? facility.generates_invoices === false
        ? 'Direct · 1099'
        : 'Direct'
      : (facility.source_name?.trim() || 'Platform');

    const billingLabel = isPlatform
      ? `Paid by ${facility.source_name?.trim() || 'platform'}`
      : facility.generates_invoices === false
      ? 'Direct · No invoicing'
      : `${cadenceLabel(facility)} · Net ${facility.invoice_due_days ?? 15}`;

    // Key contact: prefer is_primary contact, else first contact, else billing contact fields
    const primaryPerson =
      facContacts.find((c) => c.is_primary) ||
      facContacts.find((c) => /billing/i.test(c.role)) ||
      facContacts[0] ||
      null;

    const billingFallback: ClinicBrief['keyContact'] =
      facility.invoice_name_to?.trim() || facility.invoice_email_to?.trim()
        ? {
            name: facility.invoice_name_to?.trim() || facility.invoice_email_to!.trim(),
            role: 'Billing',
            email: facility.invoice_email_to?.trim() || undefined,
            source: 'billing',
          }
        : null;

    const keyContact: ClinicBrief['keyContact'] = primaryPerson
      ? {
          name: primaryPerson.name,
          role: primaryPerson.role,
          email: primaryPerson.email || undefined,
          phone: primaryPerson.phone || undefined,
          source: 'contact',
        }
      : billingFallback;

    // Attention items
    const attention: AttentionItem[] = [];
    if (isDirect && facility.generates_invoices !== false) {
      if (!(facility.invoice_name_to?.trim() && facility.invoice_email_to?.trim())) {
        attention.push({
          id: 'billing_contact',
          title: 'Missing billing contact',
          hint: 'Add a billing contact to send invoices.',
        });
      }
    }
    if (!t || (!t.weekday_rate && !t.weekend_rate && !(t.custom_rates?.length))) {
      attention.push({
        id: 'rate',
        title: 'No rate set',
        hint: 'Set a default day rate for this clinic.',
      });
    }
    if (upcoming.length === 0) {
      attention.push({
        id: 'no_shifts',
        title: 'No upcoming shifts',
        hint: 'Add the next shift you have scheduled here.',
      });
    }

    // Things to remember
    const rememberRows: Array<{ label: string; value: string }> = [];
    if (facility.tech_pims_info?.trim()) rememberRows.push({ label: 'EMR / PIMS', value: facility.tech_pims_info.trim() });
    if (facility.tech_computer_info?.trim()) rememberRows.push({ label: 'Clinic login', value: facility.tech_computer_info.trim() });
    if (facility.tech_wifi_info?.trim()) rememberRows.push({ label: 'Wi-Fi', value: facility.tech_wifi_info.trim() });
    if (facility.clinic_access_info?.trim()) rememberRows.push({ label: 'Access', value: facility.clinic_access_info.trim() });
    if (facility.notes?.trim()) rememberRows.push({ label: 'Notes', value: facility.notes.trim() });

    return {
      facility,
      isDirect,
      isPlatform,
      engagementLabel,
      cityState: cityStateFromAddress(facility.address || ''),
      timezone: tz,
      nextShift,
      nextShiftDateLabel: nextShift
        ? formatDateInTz(nextShift.start_datetime, tz, 'EEE, MMM d')
        : undefined,
      nextShiftTimeLabel: nextShift
        ? `${formatTimeInTz(nextShift.start_datetime, tz)} – ${formatTimeInTz(nextShift.end_datetime, tz)}`
        : undefined,
      upcomingThisMonthCount: upcomingThisMonth.length,
      upcomingCount: upcoming.length,
      primaryRateLabel: buildPrimaryRateLabel(t),
      billingLabel,
      keyContact,
      attention,
      rememberRows,
    };
  }, [facilityId, facilities, contacts, terms, shifts, profile]);
}
