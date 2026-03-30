import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Trash2, Zap, CheckCircle2, PartyPopper } from 'lucide-react';
import { format, differenceInCalendarDays } from 'date-fns';
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

export function InvoiceStatusGroup({
  title, icon, invoices, selected, onToggleSelect, onDelete,
  getFacilityName, emptyMessage, defaultOpen = true,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const navigate = useNavigate();

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
      </CollapsibleTrigger>

      <CollapsibleContent>
        {invoices.length === 0 ? (
          <div className="flex items-center gap-2.5 px-5 py-6 text-sm text-muted-foreground border-t">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            {emptyMessage}
          </div>
        ) : (
          <div className="overflow-x-auto border-t">
            <table className="w-full text-[13px] min-w-[600px] sm:min-w-0">
              <thead>
                <tr className="bg-muted/30">
                  <th className="p-3 w-10"><span className="sr-only">Select</span></th>
                  <th className="text-left p-3 font-semibold text-muted-foreground text-xs">Invoice #</th>
                  <th className="text-left p-3 font-semibold text-muted-foreground text-xs">Facility</th>
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
                    <td className="p-3">
                      <div>{getFacilityName(inv.facility_id)}</div>
                      {inv.billing_cadence && (
                        <span className="text-[11px] text-muted-foreground">{inv.billing_cadence.charAt(0).toUpperCase() + inv.billing_cadence.slice(1)}</span>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground hidden sm:table-cell">
                      {inv.invoice_date ? format(new Date(inv.invoice_date), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      <div className="text-muted-foreground">
                        {inv.due_date ? format(new Date(inv.due_date), 'MMM d, yyyy') : '—'}
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
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
