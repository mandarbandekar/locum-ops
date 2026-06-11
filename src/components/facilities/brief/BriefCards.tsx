import { CalendarDays, AlertTriangle, BookOpen, Wallet, User, Activity, ArrowRight, Mail, Phone, ChevronRight, Send, FileText, Receipt, KeyRound, Car, DoorOpen, Wifi, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ClinicBrief, AttentionItem } from './useClinicBrief';

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-xl border bg-card p-4 sm:p-5', className)}>{children}</section>
  );
}

function StepBadge({ n, tone }: { n: number; tone?: 'attention' }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold shrink-0',
        tone === 'attention'
          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200'
          : 'bg-muted text-muted-foreground'
      )}
    >
      {n}
    </span>
  );
}

function CardHeader({
  step,
  label,
  action,
  tone,
}: {
  step?: number;
  label: string;
  action?: React.ReactNode;
  tone?: 'attention';
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {step !== undefined && <StepBadge n={step} tone={tone} />}
      <h3 className={cn('text-sm font-semibold', tone === 'attention' ? 'text-amber-800 dark:text-amber-200' : 'text-foreground')}>
        {label}
      </h3>
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}

export function NextShiftCard({ step, brief, onViewSchedule, onAddShift }: { step?: number; brief: ClinicBrief; onViewSchedule?: () => void; onAddShift?: () => void }) {
  return (
    <Card>
      <CardHeader step={step} label="Next Shift" />
      {brief.nextShift ? (
        <div>
          <div className="text-sm text-muted-foreground">{brief.nextShiftDateLabel}</div>
          <div className="text-2xl font-semibold mt-1 tracking-tight">{brief.nextShiftTimeLabel}</div>
          {brief.primaryRateLabel && (
            <div className="text-sm text-muted-foreground mt-1.5">{brief.primaryRateLabel}</div>
          )}
          {onViewSchedule && (
            <Button variant="outline" size="sm" className="mt-4" onClick={onViewSchedule}>
              View Schedule
            </Button>
          )}
          {brief.upcomingCount > 1 && (
            <div className="text-xs text-muted-foreground mt-3">
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

export function NeedsAttentionCard({ step, items, onAction }: { step?: number; items: AttentionItem[]; onAction?: (id: string) => void }) {
  if (items.length === 0) return null;
  return (
    <Card className="border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/10">
      <CardHeader step={step} tone="attention" label="Needs Attention" />
      <ul className="space-y-1">
        {items.map((it) => (
          <li key={it.id}>
            <button
              type="button"
              onClick={() => onAction?.(it.id)}
              className="w-full flex items-center gap-2.5 py-2 text-left group"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="text-sm font-medium text-foreground flex-1 truncate">{it.title}</span>
              {it.hint && (
                <span className="text-xs text-amber-700 dark:text-amber-300 truncate max-w-[160px]">{it.hint}</span>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

const REMEMBER_ICONS: Record<string, any> = {
  'EMR / PIMS': FileText,
  'Clinic login': KeyRound,
  'Wi-Fi': Wifi,
  'Access': DoorOpen,
  'Notes': MessageSquare,
};

export function ThingsToRememberCard({ step, brief, onEdit }: { step?: number; brief: ClinicBrief; onEdit?: () => void }) {
  const rows = brief.rememberRows;
  return (
    <Card>
      <CardHeader step={step} label="Things to Remember" action={
        onEdit ? <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={onEdit}>Edit</Button> : null
      } />
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Add login details, parking, EMR, or anything you want to remember about this clinic.
        </p>
      ) : (
        <dl className="text-sm divide-y divide-border">
          {rows.map((r) => {
            const Icon = REMEMBER_ICONS[r.label] || BookOpen;
            return (
              <div key={r.label} className="grid grid-cols-[140px_1fr] gap-3 py-2.5 first:pt-0 last:pb-0 items-start">
                <dt className="flex items-center gap-2 text-xs text-muted-foreground pt-0.5">
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{r.label}</span>
                </dt>
                <dd className="whitespace-pre-wrap break-words text-foreground">{r.value}</dd>
              </div>
            );
          })}
        </dl>
      )}
    </Card>
  );
}

export function PaymentSetupCard({ step, brief, onEdit }: { step?: number; brief: ClinicBrief; onEdit?: () => void }) {
  const f = brief.facility;
  return (
    <Card>
      <CardHeader step={step} label="Payment Setup" action={
        onEdit ? <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={onEdit}>Edit</Button> : null
      } />
      {brief.isPlatform ? (
        <dl className="text-sm space-y-2.5">
          <Row label="Billing Method">Paid by {f.source_name?.trim() || 'platform'}</Row>
          <Row label="Invoicing">No LocumOps invoice needed</Row>
          {brief.primaryRateLabel && <Row label="Rate">{brief.primaryRateLabel}</Row>}
        </dl>
      ) : (
        <dl className="text-sm space-y-2.5">
          <Row label="Billing Method">{f.generates_invoices === false ? 'Direct · No invoicing' : 'Direct billing'}</Row>
          <Row label="Invoice Cadence">{cadence(f.billing_cadence)}</Row>
          <Row label="Payment Terms">Net {f.invoice_due_days ?? 15}</Row>
          {f.invoice_prefix && <Row label="Invoice Prefix">{f.invoice_prefix}</Row>}
          <Row label="Billing Contact">
            {f.invoice_name_to?.trim() ? (
              <span>
                <span className="block">{f.invoice_name_to}</span>
                {f.invoice_email_to && <span className="block text-xs text-muted-foreground">{f.invoice_email_to}</span>}
              </span>
            ) : (
              <span className="text-amber-700 dark:text-amber-300">Missing billing contact</span>
            )}
          </Row>
        </dl>
      )}
    </Card>
  );
}

function cadence(c?: string) {
  const map: Record<string, string> = { daily: 'Daily', weekly: 'Weekly', biweekly: 'Bi-weekly', monthly: 'Monthly' };
  return map[c || 'monthly'] || 'Monthly';
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3 items-baseline">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words text-foreground">{children}</dd>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

export function KeyContactCard({ step, brief, onEdit }: { step?: number; brief: ClinicBrief; onEdit?: () => void }) {
  const c = brief.keyContact;
  return (
    <Card>
      <CardHeader step={step} label="Key Contact" action={
        onEdit ? <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={onEdit}>Edit</Button> : null
      } />
      {!c ? (
        <p className="text-sm text-muted-foreground">No contact yet. Add the person you coordinate with at this clinic.</p>
      ) : (
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
            {initials(c.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold truncate">{c.name}</div>
            {c.role && <div className="text-xs text-muted-foreground mt-0.5">{c.role}{c.source === 'billing' ? ' · from billing settings' : ''}</div>}
            <div className="mt-2.5 space-y-1.5 text-sm">
              {c.phone && (
                <a href={`tel:${c.phone.replace(/\s+/g, '')}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0" /> <span>{c.phone}</span>
                </a>
              )}
              {c.email && (
                <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{c.email}</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export function RecentActivityCard({ step, brief }: { step?: number; brief: ClinicBrief }) {
  const { facility } = brief;
  return (
    <Card>
      <CardHeader step={step} label="Recent Activity" action={
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground">View all</Button>
      } />
      <RecentList facilityId={facility.id} />
    </Card>
  );
}

import { useData } from '@/contexts/DataContext';
function RecentList({ facilityId }: { facilityId: string }) {
  const { shifts, invoices } = useData();
  const now = Date.now();
  type Item = { id: string; when: number; icon: any; label: string; sub?: string; meta?: string };
  const items: Item[] = [];
  shifts
    .filter((s) => s.facility_id === facilityId && +new Date(s.start_datetime) < now)
    .slice(0, 5)
    .forEach((s) => {
      items.push({
        id: 's-' + s.id,
        when: +new Date(s.start_datetime),
        icon: CalendarDays,
        label: 'Shift worked',
        sub: new Date(s.start_datetime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      });
    });
  invoices
    .filter((i) => i.facility_id === facilityId)
    .slice(0, 5)
    .forEach((i) => {
      items.push({
        id: 'i-' + i.id,
        when: +new Date(i.invoice_date || i.period_end || Date.now()),
        icon: Receipt,
        label: `Invoice ${i.invoice_number || ''}`.trim(),
        sub: new Date(i.invoice_date || i.period_end || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        meta: i.status,
      });
    });
  items.sort((a, b) => b.when - a.when);
  const top = items.slice(0, 6);
  if (top.length === 0) return <p className="text-sm text-muted-foreground">No recent activity.</p>;
  return (
    <ul className="divide-y divide-border">
      {top.map((it) => {
        const Icon = it.icon;
        return (
          <li key={it.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-foreground truncate flex-1">{it.label}</span>
            {it.sub && <span className="text-xs text-muted-foreground">{it.sub}</span>}
            {it.meta && <span className="text-xs text-muted-foreground capitalize">· {it.meta}</span>}
          </li>
        );
      })}
    </ul>
  );
}
