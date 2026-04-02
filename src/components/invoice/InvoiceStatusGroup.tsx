import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Trash2, Zap, CheckCircle2, PartyPopper } from 'lucide-react';
import { differenceInCalendarDays } from 'date-fns';

/** Format a date string to 'MMM d, yyyy' without timezone shift. */
function formatDateSafe(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, d] = match;
    return `${MONTHS[parseInt(m, 10) - 1]} ${parseInt(d, 10)}, ${y}`;
  }
  const dt = new Date(dateStr);
  if (isNaN(dt.getTime())) return '—';
  return `${MONTHS[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
}
import { toast } from 'sonner';
import type { Invoice } from '@/types';

interface InvoiceWithStatus extends Invoice {
  computedStatus: string;
}

interface Props {
  title: string;
  icon: React.ReactNode;
  invoices: InvoiceWithStatus[];
  selected: Set<string>;
  onToggleSelect: (id: string, e: React.MouseEvent) => void;
  onDelete: (id: string) => Promise<void>;
  getFacilityName: (id: string) => string;
  emptyMessage: string;
  defaultOpen?: boolean;
  headerRight?: React.ReactNode;
  alertBanner?: React.ReactNode;
}

const statusStyles: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  partial: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  paid: 'bg-primary/15 text-primary',
  overdue: 'bg-destructive/15 text-destructive',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  partial: 'Partially Paid',
  paid: 'Paid',
  overdue: 'Overdue',
};

function getDueBadge(dueDate: string | null, status: string) {
  if (!dueDate || status === 'paid') return null;
  const days = differenceInCalendarDays(new Date(dueDate), new Date());
  if (days < 0) {
    return <span className="text-[11px] font-medium text-destructive">{Math.abs(days)}d overdue</span>;
  }
  if (days === 0) {
    return <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">Due today</span>;
  }
  if (days <= 7) {
    return <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">Due in {days}d</span>;
  }
  return <span className="text-[11px] text-muted-foreground">Due in {days}d</span>;
}

function InvoiceTable({ invoices, selected, onToggleSelect, onDelete, getFacilityName, navigate, showFacility = true }: {
  invoices: InvoiceWithStatus[];
  selected: Set<string>;
  onToggleSelect: (id: string, e: React.MouseEvent) => void;
  onDelete: (id: string) => Promise<void>;
  getFacilityName: (id: string) => string;
  navigate: (path: string) => void;
  showFacility?: boolean;
}) {
  return (
    <table className="w-full text-[13px] min-w-[600px] sm:min-w-0">
      <thead>
        <tr className="bg-muted/30">
          <th className="p-3 w-10"><span className="sr-only">Select</span></th>
          <th className="text-left p-3 font-semibold text-muted-foreground text-xs">Invoice #</th>
          {showFacility && <th className="text-left p-3 font-semibold text-muted-foreground text-xs">Facility</th>}
          <th className="text-left p-3 font-semibold text-muted-foreground text-xs hidden sm:table-cell">Invoice Date</th>
          <th className="text-left p-3 font-semibold text-muted-foreground text-xs hidden md:table-cell">Due Date</th>
          <th className="text-right p-3 font-semibold text-muted-foreground text-xs">Total</th>
          <th className="text-right p-3 font-semibold text-muted-foreground text-xs hidden sm:table-cell">Balance</th>
          <th className="text-left p-3 font-semibold text-muted-foreground text-xs">Status</th>
          <th className="w-10" />
        </tr>
      </thead>
      <tbody>
        {invoices.map(inv => (
          <tr
            key={inv.id}
            className={`border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors ${selected.has(inv.id) ? 'bg-primary/5' : ''}`}
            onClick={() => navigate(`/invoices/${inv.id}`)}
          >
            <td className="p-3" onClick={e => onToggleSelect(inv.id, e)}>
              <Checkbox checked={selected.has(inv.id)} />
            </td>
            <td className="p-3 font-semibold">
              <div className="flex items-center gap-1.5 flex-wrap">
                {inv.invoice_number}
                {inv.invoice_type === 'bulk' && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0">Bulk</Badge>
                )}
                {inv.generation_type === 'automatic' && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0 text-primary border-primary/30">
                    <Zap className="h-2.5 w-2.5 mr-0.5" />Auto
                  </Badge>
                )}
              </div>
            </td>
            {showFacility && (
              <td className="p-3">
                <div>{getFacilityName(inv.facility_id)}</div>
                {inv.billing_cadence && (
                  <span className="text-[11px] text-muted-foreground">{inv.billing_cadence.charAt(0).toUpperCase() + inv.billing_cadence.slice(1)}</span>
                )}
              </td>
            )}
            <td className="p-3 text-muted-foreground hidden sm:table-cell">
              {formatDateSafe(inv.invoice_date)}
            </td>
            <td className="p-3 hidden md:table-cell">
              <div className="text-muted-foreground">
                {formatDateSafe(inv.due_date)}
              </div>
              {inv.due_date && getDueBadge(inv.due_date, inv.computedStatus)}
            </td>
            <td className="p-3 text-right font-medium">${(inv.total_amount ?? 0).toLocaleString()}</td>
            <td className="p-3 text-right hidden sm:table-cell">
              {(inv.balance_due ?? 0) > 0 ? <span className="font-medium">${(inv.balance_due ?? 0).toLocaleString()}</span> : <span className="text-muted-foreground">—</span>}
            </td>
            <td className="p-3">
              <Badge className={`${statusStyles[inv.computedStatus] || statusStyles.draft} text-xs font-medium`}>
                {statusLabels[inv.computedStatus] || inv.computedStatus}
              </Badge>
            </td>
            <td className="p-3" onClick={e => e.stopPropagation()}>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={async () => {
                  await onDelete(inv.id);
                  toast.success('Invoice deleted');
                }}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function InvoiceStatusGroup({
  title, icon, invoices, selected, onToggleSelect, onDelete,
  getFacilityName, emptyMessage, defaultOpen = true, groupByFacility = false,
  headerRight, alertBanner,
}: Props & { groupByFacility?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const navigate = useNavigate();

  // Group invoices by facility
  const facilityGroups = groupByFacility && invoices.length > 0
    ? Object.entries(
        invoices.reduce<Record<string, InvoiceWithStatus[]>>((acc, inv) => {
          const fId = inv.facility_id;
          if (!acc[fId]) acc[fId] = [];
          acc[fId].push(inv);
          return acc;
        }, {})
      )
        .map(([fId, invs]) => ({ facilityId: fId, name: getFacilityName(fId), invoices: invs }))
        .sort((a, b) => a.name.localeCompare(b.name))
    : null;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-xl border bg-card overflow-hidden">
      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-2.5">
          {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <span className="flex items-center gap-2">
            {icon}
            <span className="font-semibold text-sm">{title}</span>
          </span>
          <Badge variant="secondary" className="text-xs ml-1">{invoices.length}</Badge>
        </div>
        {headerRight && <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>{headerRight}</div>}
      </CollapsibleTrigger>

      <CollapsibleContent>
        {alertBanner}
        {invoices.length === 0 ? (
          <div className="flex items-center gap-2.5 px-5 py-6 text-sm text-muted-foreground border-t">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            {emptyMessage}
          </div>
        ) : facilityGroups ? (
          <div className="border-t">
            {facilityGroups.map(group => (
              <FacilitySubGroup
                key={group.facilityId}
                name={group.name}
                invoices={group.invoices}
                selected={selected}
                onToggleSelect={onToggleSelect}
                onDelete={onDelete}
                getFacilityName={getFacilityName}
                navigate={navigate}
              />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto border-t">
            <InvoiceTable
              invoices={invoices}
              selected={selected}
              onToggleSelect={onToggleSelect}
              onDelete={onDelete}
              getFacilityName={getFacilityName}
              navigate={navigate}
            />
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function FacilitySubGroup({ name, invoices, selected, onToggleSelect, onDelete, getFacilityName, navigate }: {
  name: string;
  invoices: InvoiceWithStatus[];
  selected: Set<string>;
  onToggleSelect: (id: string, e: React.MouseEvent) => void;
  onDelete: (id: string) => Promise<void>;
  getFacilityName: (id: string) => string;
  navigate: (path: string) => void;
}) {
  const [subOpen, setSubOpen] = useState(true);
  const total = invoices.reduce((s, i) => s + (i.total_amount ?? 0), 0);

  return (
    <Collapsible open={subOpen} onOpenChange={setSubOpen} className="border-b last:border-0">
      <CollapsibleTrigger className="flex items-center justify-between w-full px-5 py-3 hover:bg-amber-100/60 dark:hover:bg-amber-900/20 bg-amber-50/70 dark:bg-amber-950/15 transition-colors">
        <div className="flex items-center gap-2">
          {subOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
          <span className="font-medium text-sm">{name}</span>
          <Badge variant="secondary" className="text-[11px] ml-1">{invoices.length}</Badge>
        </div>
        <span className="text-sm font-bold text-amber-700 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-900/30 px-2 py-0.5 rounded-md">${total.toLocaleString()}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="overflow-x-auto">
          <InvoiceTable
            invoices={invoices}
            selected={selected}
            onToggleSelect={onToggleSelect}
            onDelete={onDelete}
            getFacilityName={getFacilityName}
            navigate={navigate}
            showFacility={false}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
