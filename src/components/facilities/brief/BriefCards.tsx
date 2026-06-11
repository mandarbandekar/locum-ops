import { CalendarDays, AlertTriangle, BookOpen, Wallet, User, Activity, ArrowRight, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ClinicBrief, AttentionItem } from './useClinicBrief';

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-xl border bg-card p-4 sm:p-5', className)}>{children}</section>
  );
}

function CardHeader({ icon: Icon, label, action }: { icon: any; label: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</h3>
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}

export function NextShiftCard({ brief, onViewSchedule, onAddShift }: { brief: ClinicBrief; onViewSchedule?: () => void; onAddShift?: () => void }) {
  return (
    <Card>
      <CardHeader icon={CalendarDays} label="Next shift" action={
        brief.nextShift && onViewSchedule ? (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onViewSchedule}>
            View schedule <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        ) : null
      } />
      {brief.nextShift ? (
        <div>
          <div className="text-base font-semibold">{brief.nextShiftDateLabel}</div>
          <div className="text-sm text-muted-foreground mt-0.5">{brief.nextShiftTimeLabel}</div>
          {brief.primaryRateLabel && (
            <div className="text-sm text-muted-foreground mt-1">{brief.primaryRateLabel}</div>
          )}
          {brief.upcomingCount > 1 && (
            <div className="text-xs text-muted-foreground mt-2">
              {brief.upcomingThisMonthCount} upcoming this month · {brief.upcomingCount} total scheduled
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">No upcoming shifts at this clinic.</p>
          {onAddShift && (
            <Button size="sm" variant="outline" onClick={onAddShift}>Add shift</Button>
          )}
        </div>
      )}
    </Card>
  );
}

export function NeedsAttentionCard({ items, onAction }: { items: AttentionItem[]; onAction?: (id: string) => void }) {
  if (items.length === 0) return null;
  return (
    <Card className="border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/10">
      <CardHeader icon={AlertTriangle} label="Needs attention" />
      <ul className="divide-y divide-amber-200/60 dark:divide-amber-900/40">
        {items.map((it) => (
          <li key={it.id} className="py-2 first:pt-0 last:pb-0 flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-amber-900 dark:text-amber-200">{it.title}</div>
              {it.hint && <div className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">{it.hint}</div>}
            </div>
            {onAction && (
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => onAction(it.id)}>
                Fix
              </Button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function ThingsToRememberCard({ brief, onEdit }: { brief: ClinicBrief; onEdit?: () => void }) {
  const rows = brief.rememberRows;
  return (
    <Card>
      <CardHeader icon={BookOpen} label="Things to remember" action={
        onEdit ? <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onEdit}>Edit</Button> : null
      } />
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Add login details, parking, EMR, or anything you want to remember about this clinic.
        </p>
      ) : (
        <dl className="text-sm space-y-2">
          {rows.map((r) => (
            <div key={r.label} className="grid grid-cols-[110px_1fr] gap-3">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground pt-0.5">{r.label}</dt>
              <dd className="whitespace-pre-wrap break-words">{r.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </Card>
  );
}

export function PaymentSetupCard({ brief, onEdit }: { brief: ClinicBrief; onEdit?: () => void }) {
  const f = brief.facility;
  return (
    <Card>
      <CardHeader icon={Wallet} label="Payment setup" action={
        onEdit ? <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onEdit}>Edit</Button> : null
      } />
      {brief.isPlatform ? (
        <dl className="text-sm space-y-2">
          <Row label="Billing">Paid by {f.source_name?.trim() || 'platform'}</Row>
          <Row label="Invoicing">No LocumOps invoice needed</Row>
          {brief.primaryRateLabel && <Row label="Rate">{brief.primaryRateLabel}</Row>}
        </dl>
      ) : (
        <dl className="text-sm space-y-2">
          <Row label="Billing">{brief.billingLabel}</Row>
          {f.invoice_prefix && <Row label="Invoice prefix">{f.invoice_prefix}</Row>}
          <Row label="Contact">
            {f.invoice_name_to?.trim() || f.invoice_email_to?.trim() || (
              <span className="text-amber-700 dark:text-amber-300">Missing billing contact</span>
            )}
          </Row>
          {brief.primaryRateLabel && <Row label="Rate">{brief.primaryRateLabel}</Row>}
        </dl>
      )}
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground pt-0.5">{label}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  );
}

export function KeyContactCard({ brief, onEdit }: { brief: ClinicBrief; onEdit?: () => void }) {
  const c = brief.keyContact;
  return (
    <Card>
      <CardHeader icon={User} label="Key contact" action={
        onEdit ? <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onEdit}>Edit</Button> : null
      } />
      {!c ? (
        <p className="text-sm text-muted-foreground">No contact yet. Add the person you coordinate with at this clinic.</p>
      ) : (
        <div>
          <div className="text-base font-semibold">{c.name}</div>
          {c.role && <div className="text-xs text-muted-foreground mt-0.5">{c.role}{c.source === 'billing' ? ' · from billing settings' : ''}</div>}
          <div className="mt-2 space-y-1 text-sm">
            {c.email && (
              <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                <Mail className="h-3.5 w-3.5" /> <span className="truncate">{c.email}</span>
              </a>
            )}
            {c.phone && (
              <a href={`tel:${c.phone.replace(/\s+/g, '')}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                <Phone className="h-3.5 w-3.5" /> <span>{c.phone}</span>
              </a>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

export function RecentActivityCard({ brief }: { brief: ClinicBrief }) {
  // Show last 3 shifts (past) as a lightweight activity feed using existing shift data.
  const { facility } = brief;
  // Lazy import to avoid extra hook plumbing; we re-derive from data context where used.
  return (
    <Card>
      <CardHeader icon={Activity} label="Recent activity" />
      <RecentList facilityId={facility.id} />
    </Card>
  );
}

import { useData } from '@/contexts/DataContext';
function RecentList({ facilityId }: { facilityId: string }) {
  const { shifts, invoices } = useData();
  const now = Date.now();
  const items: Array<{ id: string; when: number; label: string; sub?: string }> = [];
  shifts
    .filter((s) => s.facility_id === facilityId && +new Date(s.start_datetime) < now)
    .slice(0, 3)
    .forEach((s) => {
      items.push({
        id: 's-' + s.id,
        when: +new Date(s.start_datetime),
        label: 'Shift worked',
        sub: new Date(s.start_datetime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      });
    });
  invoices
    .filter((i) => i.facility_id === facilityId)
    .slice(0, 3)
    .forEach((i) => {
      items.push({
        id: 'i-' + i.id,
        when: +new Date(i.created_at || Date.now()),
        label: `Invoice ${i.invoice_number || ''}`.trim(),
        sub: i.status,
      });
    });
  items.sort((a, b) => b.when - a.when);
  const top = items.slice(0, 5);
  if (top.length === 0) return <p className="text-sm text-muted-foreground">No recent activity.</p>;
  return (
    <ul className="text-sm space-y-2">
      {top.map((it) => (
        <li key={it.id} className="flex items-baseline gap-3">
          <span className="text-foreground">{it.label}</span>
          {it.sub && <span className="text-xs text-muted-foreground ml-auto">{it.sub}</span>}
        </li>
      ))}
    </ul>
  );
}
