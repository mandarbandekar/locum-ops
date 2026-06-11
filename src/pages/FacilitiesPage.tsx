import { useEffect, useMemo, useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, MapPin, AlertTriangle, Mail, User, Building2, Search, CalendarDays, MoreVertical, Trash2 } from 'lucide-react';
import { AddFacilityDialog } from '@/components/AddFacilityDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { getEngagementPill } from '@/lib/engagementOptions';
import { cn } from '@/lib/utils';
import { resolveShiftTz } from '@/lib/resolveTimezone';
import { formatDateInTz, formatTimeInTz } from '@/lib/tzTime';
import type { Facility } from '@/types';

import { useIsMobileShell } from '@/hooks/useIsMobileShell';
import { MobileClinicsPage } from '@/pages/mobile/MobileClinicsPage';

type FilterKey = 'all' | 'direct' | 'platform' | 'attention' | 'archived';

export default function FacilitiesPage() {
  const isMobile = useIsMobileShell();
  if (isMobile) return <MobileClinicsPage />;
  return <DesktopFacilitiesPage />;
}

function DesktopFacilitiesPage() {
  const { facilities, shifts, terms, contacts, deleteFacility } = useData();
  const { profile } = useUserProfile();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAdd, setShowAdd] = useState(false);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [confirmDelete, setConfirmDelete] = useState<Facility | null>(null);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowAdd(true);
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const enriched = useMemo(() => {
    const now = Date.now();
    return facilities.map((f) => {
      const isDirect = (f.engagement_type || 'direct') === 'direct';
      const t = terms.find((x) => x.facility_id === f.id);
      const facShifts = shifts.filter((s) => s.facility_id === f.id);
      const next = facShifts
        .filter((s) => +new Date(s.start_datetime) >= now)
        .sort((a, b) => +new Date(a.start_datetime) - +new Date(b.start_datetime))[0];
      const tz = next ? resolveShiftTz(next as any, f as any, profile as any) : f.timezone || 'America/New_York';
      const hasBillingContact = !!(f.invoice_name_to?.trim() && f.invoice_email_to?.trim());
      const hasRate = !!(t && (t.weekday_rate || t.weekend_rate || (t.custom_rates?.length || 0) > 0));
      const facContacts = contacts.filter((c) => c.facility_id === f.id);
      const primaryContact = facContacts.find((c) => c.is_primary) || facContacts[0];

      const attention: string[] = [];
      if (isDirect && f.generates_invoices !== false && !hasBillingContact) attention.push('Missing billing contact');
      if (!hasRate) attention.push('No rate set');
      if (!next) attention.push('No upcoming shifts');

      const rateLabel = t?.weekday_rate
        ? `$${t.weekday_rate.toLocaleString()}/day`
        : t?.weekend_rate
        ? `$${t.weekend_rate.toLocaleString()}/day`
        : t?.custom_rates?.[0]
        ? `$${t.custom_rates[0].amount.toLocaleString()}${t.custom_rates[0].kind === 'hourly' ? '/hr' : '/day'}`
        : null;

      const billingLabel = isDirect
        ? f.generates_invoices === false
          ? 'Direct · No invoicing'
          : `${(f.billing_cadence || 'monthly')[0].toUpperCase() + (f.billing_cadence || 'monthly').slice(1)} · Net ${f.invoice_due_days ?? 15}`
        : `Paid by ${f.source_name?.trim() || 'platform'}`;

      return {
        f,
        isDirect,
        next,
        tz,
        rateLabel,
        billingLabel,
        primaryContact,
        attention,
        hasBillingContact,
      };
    });
  }, [facilities, shifts, terms, contacts, profile]);

  const hasArchived = facilities.some((f) => f.status !== 'active');

  const stats = useMemo(() => {
    const active = enriched.filter((e) => e.f.status === 'active');
    return {
      total: active.length,
      direct: active.filter((e) => e.isDirect).length,
      platform: active.filter((e) => !e.isDirect).length,
      attention: active.filter((e) => e.attention.length > 0).length,
    };
  }, [enriched]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return enriched.filter((e) => {
      if (filter === 'archived') {
        if (e.f.status === 'active') return false;
      } else {
        if (e.f.status !== 'active') return false;
        if (filter === 'direct' && !e.isDirect) return false;
        if (filter === 'platform' && e.isDirect) return false;
        if (filter === 'attention' && e.attention.length === 0) return false;
      }
      if (term && !e.f.name.toLowerCase().includes(term) && !(e.f.address || '').toLowerCase().includes(term)) return false;
      return true;
    });
  }, [enriched, filter, q]);

  const isEmpty = facilities.length === 0;

  return (
    <div>
      <div className="page-header flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="page-title">Clinics</h1>
            <p className="page-subtitle">Your clinic network, rates, contacts, and working notes.</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)} className="w-full sm:w-auto sm:ml-auto">
          <Plus className="mr-1 h-4 w-4" /> Add Clinic
        </Button>
      </div>

      {isEmpty ? (
        <div className="rounded-lg border bg-card p-12 flex flex-col items-center text-center">
          <div className="rounded-full bg-muted p-3 mb-3">
            <Building2 className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-base">No clinics yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Add the clinics where you work to track shifts, billing contacts, and engagement terms in one place.
          </p>
          <Button size="sm" className="mt-4" onClick={() => setShowAdd(true)}>
            <Plus className="mr-1 h-4 w-4" /> Add your first clinic
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search clinics..."
                className="pl-9 h-9"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <FilterChip label={`All (${stats.total})`} active={filter === 'all'} onClick={() => setFilter('all')} />
              <FilterChip label={`Direct (${stats.direct})`} active={filter === 'direct'} onClick={() => setFilter('direct')} />
              <FilterChip label={`Platform (${stats.platform})`} active={filter === 'platform'} onClick={() => setFilter('platform')} />
              <FilterChip label={`Needs action (${stats.attention})`} active={filter === 'attention'} onClick={() => setFilter('attention')} tone="attention" />
              {hasArchived && <FilterChip label="Archived" active={filter === 'archived'} onClick={() => setFilter('archived')} />}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((e) => (
              <ClinicListCard
                key={e.f.id}
                facility={e.f}
                isDirect={e.isDirect}
                nextDate={e.next ? formatDateInTz(e.next.start_datetime, e.tz, 'EEE, MMM d') : null}
                nextTime={e.next ? `${formatTimeInTz(e.next.start_datetime, e.tz)} – ${formatTimeInTz(e.next.end_datetime, e.tz)}` : null}
                rateLabel={e.rateLabel}
                billingLabel={e.billingLabel}
                primaryContactName={e.primaryContact?.name || (e.hasBillingContact ? e.f.invoice_name_to : null)}
                attention={e.attention}
                onOpen={() => navigate(`/facilities/${e.f.id}`)}
                onDelete={() => setConfirmDelete(e.f)}
              />
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-sm text-muted-foreground py-8 text-center">
                No clinics match this filter.
              </div>
            )}
          </div>
        </>
      )}

      <AddFacilityDialog open={showAdd} onOpenChange={setShowAdd} />

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirmDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will also delete all contacts, shifts, and invoices associated with this clinic.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDelete) {
                  deleteFacility(confirmDelete.id);
                  toast.success('Clinic deleted');
                  setConfirmDelete(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FilterChip({ label, active, onClick, tone }: { label: string; active: boolean; onClick: () => void; tone?: 'attention' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center rounded-full border px-3 h-8 text-xs font-medium transition-colors',
        active
          ? tone === 'attention'
            ? 'bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-200'
            : 'bg-primary text-primary-foreground border-primary'
          : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/30',
      )}
    >
      {label}
    </button>
  );
}

function ClinicListCard({
  facility,
  isDirect,
  nextDate,
  nextTime,
  rateLabel,
  billingLabel,
  primaryContactName,
  attention,
  onOpen,
  onDelete,
}: {
  facility: Facility;
  isDirect: boolean;
  nextDate: string | null;
  nextTime: string | null;
  rateLabel: string | null;
  billingLabel: string;
  primaryContactName: string | null;
  attention: string[];
  onOpen: () => void;
  onDelete: () => void;
}) {
  const pill = getEngagementPill(facility);
  const primaryAttention = attention[0];
  return (
    <Card
      className="cursor-pointer transition-colors hover:border-primary/40 group"
      onClick={onOpen}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm sm:text-base truncate">{facility.name}</h3>
            {facility.address && (
              <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{facility.address}</span>
              </p>
            )}
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground opacity-60 group-hover:opacity-100">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={onOpen}>Open clinic</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap mt-3">
          <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium max-w-[160px] truncate', pill.className)}>
            {pill.label}
          </span>
        </div>

        <dl className="mt-4 space-y-2 text-xs">
          <Row icon={CalendarDays} label="Next">
            {nextDate ? (
              <span>
                <span className="font-medium text-foreground">{nextDate}</span>
                {nextTime && <span className="text-muted-foreground"> · {nextTime}</span>}
              </span>
            ) : (
              <span className="text-muted-foreground">No shifts scheduled</span>
            )}
          </Row>
          {rateLabel && (
            <Row label="Rate">
              <span>{rateLabel}</span>
            </Row>
          )}
          <Row icon={Mail} label="Billing">
            <span className="text-muted-foreground">{billingLabel}</span>
          </Row>
          <Row icon={User} label="Contact">
            {primaryContactName ? (
              <span className="truncate">{primaryContactName}</span>
            ) : isDirect ? (
              <span className="text-amber-700 dark:text-amber-300">Missing billing contact</span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </Row>
        </dl>

        {primaryAttention && (
          <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-800 dark:text-amber-200 bg-amber-100/70 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-900/50 rounded-full px-2 py-0.5">
            <AlertTriangle className="h-3 w-3" /> {primaryAttention}
            {attention.length > 1 && <span className="text-amber-700/70 dark:text-amber-300/70">+{attention.length - 1}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ icon: Icon, label, children }: { icon?: any; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2 min-w-0">
      <div className="flex items-center gap-1 w-[60px] shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </div>
      <div className="min-w-0 flex-1 truncate">{children}</div>
    </div>
  );
}
